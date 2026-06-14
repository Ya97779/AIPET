import { PawPrint, User } from 'lucide-react';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
}

export function ChatBubble({ role, content, isLoading }: Props) {
  const isUser = role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-primary-100' : 'bg-accent-100'
      }`}>
        {isUser ? <User size={16} className="text-primary-600" /> : <PawPrint size={16} className="text-accent-600" />}
      </div>
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
        isUser
          ? 'bg-primary-600 text-white rounded-tr-md'
          : 'bg-white border border-slate-200 rounded-tl-md'
      }`}>
        <div className="text-sm whitespace-pre-wrap leading-relaxed">
          {content || (isLoading ? '思考中...' : '')}
          {isLoading && <span className="animate-pulse ml-0.5">▌</span>}
        </div>
      </div>
    </div>
  );
}
