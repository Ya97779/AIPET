'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { ChatBubble } from '@/components/consultation/chat-bubble';
import { streamSSE } from '@/lib/sse';
import { Send, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Message { id: string; role: string; content: string; created_at: string; }

export default function ChatPage() {
  const { sessionId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    apiGet<Message[]>(`/consultation/chat/${sessionId}/history`).then(setMessages);
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = () => {
    if (!input.trim() || loading) return;

    const userContent = input.trim();
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: userContent, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setStreamingContent('');

    const formData = new FormData();
    formData.append('text', userContent);

    cancelRef.current = streamSSE(
      `/api/consultation/chat/${sessionId}`,
      formData,
      (chunk) => setStreamingContent(prev => prev + chunk),
      () => {
        if (streamingContent) {
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: streamingContent, created_at: new Date().toISOString() }]);
        }
        setStreamingContent('');
        setLoading(false);
      },
      (err) => {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `错误: ${err}`, created_at: new Date().toISOString() }]);
        setStreamingContent('');
        setLoading(false);
      },
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/consultation" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">AI对话医生</h1>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 rounded-2xl p-6 mb-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <p className="text-slate-400 mb-2">描述宠物的症状，AI医生将为您分析</p>
            <p className="text-sm text-slate-400">支持多轮对话，AI会追问更多信息</p>
          </div>
        )}
        {messages.map(msg => (
          <ChatBubble key={msg.id} role={msg.role as 'user' | 'assistant'} content={msg.content} />
        ))}
        {loading && <ChatBubble role="assistant" content={streamingContent} isLoading />}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-3">
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          className="input flex-1" placeholder="描述宠物的症状..." disabled={loading} />
        <button onClick={handleSend} disabled={loading || !input.trim()}
          className="btn-primary px-6 flex items-center gap-2">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
