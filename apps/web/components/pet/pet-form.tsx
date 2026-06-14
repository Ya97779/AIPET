'use client';

import { useState } from 'react';

interface PetFormData {
  name: string;
  species: string;
  breed: string;
  gender: string;
  neutered: boolean;
  birthday: string;
  weight_kg: string;
  medical_history: string[];
  allergies: string[];
}

interface Props {
  initialData?: Partial<PetFormData>;
  onSubmit: (data: PetFormData) => Promise<void>;
  submitLabel?: string;
}

export function PetForm({ initialData, onSubmit, submitLabel = '保存' }: Props) {
  const [form, setForm] = useState<PetFormData>({
    name: initialData?.name || '',
    species: initialData?.species || 'cat',
    breed: initialData?.breed || '',
    gender: initialData?.gender || 'male',
    neutered: initialData?.neutered || false,
    birthday: initialData?.birthday || '',
    weight_kg: initialData?.weight_kg?.toString() || '',
    medical_history: initialData?.medical_history || [],
    allergies: initialData?.allergies || [],
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await onSubmit(form); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">宠物昵称 *</label>
          <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
            className="input" required placeholder="如：小橘" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">种类 *</label>
          <select value={form.species} onChange={e => setForm({...form, species: e.target.value})} className="input">
            <option value="cat">🐱 猫</option>
            <option value="dog">🐶 狗</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">品种 *</label>
          <input type="text" value={form.breed} onChange={e => setForm({...form, breed: e.target.value})}
            className="input" required placeholder="如：英短、金毛" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">性别 *</label>
          <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="input">
            <option value="male">公</option>
            <option value="female">母</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">生日</label>
          <input type="date" value={form.birthday} onChange={e => setForm({...form, birthday: e.target.value})} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">体重 (kg)</label>
          <input type="number" step="0.1" value={form.weight_kg} onChange={e => setForm({...form, weight_kg: e.target.value})}
            className="input" placeholder="4.5" />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.neutered} onChange={e => setForm({...form, neutered: e.target.checked})}
          className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
        <span className="text-sm text-slate-700">已绝育</span>
      </label>
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? '保存中...' : submitLabel}
      </button>
    </form>
  );
}
