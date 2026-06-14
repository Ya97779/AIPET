'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { Camera, MessageSquare, ArrowRight, PawPrint } from 'lucide-react';
import Link from 'next/link';

interface Pet { id: string; name: string; species: string; }

export default function ConsultationPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => { apiGet<Pet[]>('/pets').then(setPets); }, []);

  const handleStartChat = async () => {
    if (!selectedPet || starting) return;
    setStarting(true);
    try {
      const res = await apiPost<{id: string}>('/consultation/chat/start', { pet_id: selectedPet });
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
        <label className="block text-sm font-medium text-slate-700 mb-2">选择宠物</label>
        <select value={selectedPet} onChange={e => setSelectedPet(e.target.value)} className="input max-w-xs">
          <option value="">请选择宠物</option>
          {pets.map(p => <option key={p.id} value={p.id}>{p.name} ({p.species === 'cat' ? '猫' : '狗'})</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href={selectedPet ? `/consultation/image?petId=${selectedPet}` : '#'}
          className={`card hover:shadow-lg transition-all group ${!selectedPet ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
            <Camera size={28} className="text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">传图识病</h2>
          <p className="text-slate-500 mb-5">上传宠物患处照片，AI快速分析可能的病因和护理建议</p>
          <span className="text-primary-600 flex items-center gap-1.5 font-medium">
            开始诊断 <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </span>
        </Link>

        <button onClick={handleStartChat} disabled={!selectedPet || starting}
          className={`card hover:shadow-lg transition-all group text-left ${!selectedPet ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
            <MessageSquare size={28} className="text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">AI对话医生</h2>
          <p className="text-slate-500 mb-5">通过多轮对话，让AI帮你逐步分析宠物健康问题</p>
          <span className="text-primary-600 flex items-center gap-1.5 font-medium">
            {starting ? '创建中...' : '开始问诊'} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </span>
        </button>
      </div>
    </div>
  );
}
