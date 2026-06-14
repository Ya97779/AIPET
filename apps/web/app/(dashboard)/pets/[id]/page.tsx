'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiGet, apiPut, apiPost } from '@/lib/api';
import { PetForm } from '@/components/pet/pet-form';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';

interface Pet {
  id: string; name: string; species: string; breed: string; gender: string;
  neutered: boolean; birthday: string | null; weight_kg: number | null;
  medical_history: string[]; allergies: string[];
}

interface WeightRecord { id: string; weight_kg: number; recorded_at: string; }

export default function PetDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [pet, setPet] = useState<Pet | null>(null);
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [newWeight, setNewWeight] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<Pet>(`/pets/${id}`).then(setPet);
    apiGet<WeightRecord[]>(`/pets/${id}/weight/history`).then(setWeights);
  }, [id]);

  const handleUpdate = async (data: any) => {
    await apiPut(`/pets/${id}`, { ...data, weight_kg: data.weight_kg ? parseFloat(data.weight_kg) : null });
    router.push('/pets');
  };

  const handleAddWeight = async () => {
    if (!newWeight) return;
    setSaving(true);
    try {
      const record = await apiPost<WeightRecord>(`/pets/${id}/weight`, {
        weight_kg: parseFloat(newWeight),
        recorded_at: new Date().toISOString().split('T')[0],
      });
      setWeights([record, ...weights]);
      setNewWeight('');
    } finally { setSaving(false); }
  };

  if (!pet) return <div className="flex items-center justify-center h-64"><div className="text-slate-400">加载中...</div></div>;

  return (
    <div>
      <Link href="/pets" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft size={16} /> 返回宠物列表
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{pet.name}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-semibold mb-4">基本信息</h2>
          <PetForm initialData={pet} onSubmit={handleUpdate} submitLabel="更新档案" />
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">体重记录</h2>
          <div className="flex gap-2 mb-4">
            <input type="number" step="0.1" value={newWeight} onChange={e => setNewWeight(e.target.value)}
              placeholder="体重(kg)" className="input flex-1" />
            <button onClick={handleAddWeight} disabled={saving || !newWeight} className="btn-primary flex items-center gap-1.5">
              <Plus size={16} /> 记录
            </button>
          </div>
          <div className="space-y-0">
            {weights.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">暂无体重记录</p>
            ) : (
              weights.map((w, i) => (
                <div key={w.id} className={`flex justify-between items-center py-3 ${i < weights.length - 1 ? 'border-b border-slate-100' : ''}`}>
                  <span className="text-sm text-slate-500">{formatDate(w.recorded_at)}</span>
                  <span className="font-mono font-medium text-slate-900">{w.weight_kg} kg</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
