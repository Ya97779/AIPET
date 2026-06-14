'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { Camera, MessageSquare, ArrowRight, PawPrint, FileText } from 'lucide-react';
import Link from 'next/link';

interface Pet { id: string; name: string; species: string; }

export default function ConsultationPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState('');
  const [starting, setStarting] = useState(false);

  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    apiGet<Pet[]>('/pets').then(setPets);
    // Fetch all history: chat sessions + image/lab consultations
    Promise.all([
      apiGet<{ sessions: any[] }>('/consultation/chat/sessions').catch(() => ({ sessions: [] })),
      apiGet<{ items: any[] }>('/consultation/history').catch(() => ({ items: [] })),
    ]).then(([chatRes, consultRes]) => {
      const chatItems = (chatRes.sessions || []).map((s: any) => ({
        id: s.id, type: 'chat', title: s.summary || '未命名对话',
        status: s.status, created_at: s.created_at,
      }));
      const consultItems = (consultRes.items || []).map((c: any) => ({
        id: c.id, type: c.type,
        title: c.type === 'image' ? (c.input_text || '传图识病') : (c.input_text || '化验单解读'),
        status: 'ended', created_at: c.created_at,
      }));
      // Merge and sort by date
      const all = [...chatItems, ...consultItems].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setHistory(all);
    });
  }, []);

  const handleStartChat = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const res = await apiPost<{id: string}>('/consultation/chat/start', { pet_id: selectedPet || null });
      window.location.href = `/consultation/chat/${res.id}`;
    } finally { setStarting(false); }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">AI问诊大厅</h1>
        <p className="text-slate-500 mt-1">选择问诊方式，AI为您提供专业分析</p>
      </div>

      <div className="card mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">选择宠物（可选，有助于AI更精准分析）</label>
        <select value={selectedPet} onChange={e => setSelectedPet(e.target.value)} className="input max-w-xs">
          <option value="">不选择宠物</option>
          {pets.map(p => <option key={p.id} value={p.id}>{p.name} ({p.species === 'cat' ? '猫' : '狗'})</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href={`/consultation/image${selectedPet ? `?petId=${selectedPet}` : ''}`}
          className="card hover:shadow-lg transition-all group">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
            <Camera size={28} className="text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">传图识病</h2>
          <p className="text-slate-500 mb-5">上传宠物患处照片，AI快速分析可能的病因和护理建议</p>
          <span className="text-primary-600 flex items-center gap-1.5 font-medium">
            开始诊断 <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </span>
        </Link>

        <button onClick={handleStartChat} disabled={starting}
          className="card hover:shadow-lg transition-all group text-left">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
            <MessageSquare size={28} className="text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">AI对话医生</h2>
          <p className="text-slate-500 mb-5">通过多轮对话，让AI帮你逐步分析宠物健康问题</p>
          <span className="text-primary-600 flex items-center gap-1.5 font-medium">
            {starting ? '创建中...' : '开始问诊'} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </span>
        </button>

        <Link href={`/consultation/lab-report${selectedPet ? `?petId=${selectedPet}` : ''}`}
          className="card hover:shadow-lg transition-all group">
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
            <FileText size={28} className="text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">化验单解读</h2>
          <p className="text-slate-500 mb-5">上传化验单图片，AI为您结构化解读各项指标</p>
          <span className="text-primary-600 flex items-center gap-1.5 font-medium">
            开始解读 <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </span>
        </Link>
      </div>

      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">历史记录</h2>
          <div className="space-y-3">
            {history.map((item: any) => {
              const href = item.type === 'chat' ? `/consultation/chat/${item.id}` :
                           item.type === 'image' ? `/consultation/image` :
                           `/consultation/lab-report`;
              const typeLabel = item.type === 'chat' ? 'AI对话' :
                                item.type === 'image' ? '传图识病' : '化验单';
              const typeColor = item.type === 'chat' ? 'bg-blue-50 text-blue-700' :
                                item.type === 'image' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700';

              return (
                <Link key={`${item.type}-${item.id}`} href={href} className="card hover:shadow-md transition-all block">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-3 flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${typeColor}`}>{typeLabel}</span>
                      <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.type === 'chat' && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {item.status === 'active' ? '进行中' : '已结束'}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString('zh-CN')}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
