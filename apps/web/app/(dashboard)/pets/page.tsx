'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiDelete } from '@/lib/api';
import { Plus, Trash2, Edit, PawPrint } from 'lucide-react';

interface Pet {
  id: string; name: string; species: string; breed: string;
  gender: string; neutered: boolean; weight_kg: number | null; created_at: string;
}

export default function PetsPage() {
  const [pets, setPets] = useState<Pet[]>([]);

  useEffect(() => { apiGet<Pet[]>('/pets').then(setPets); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除「${name}」？此操作不可撤销。`)) return;
    await apiDelete(`/pets/${id}`);
    setPets(pets.filter(p => p.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">宠物档案</h1>
          <p className="text-slate-500 mt-1">管理您的宠物信息</p>
        </div>
        <Link href="/pets/new" className="btn-primary flex items-center gap-2">
          <Plus size={18} /> 添加宠物
        </Link>
      </div>

      {pets.length === 0 ? (
        <div className="card text-center py-16">
          <PawPrint size={64} className="mx-auto text-slate-300 mb-4" />
          <p className="text-lg text-slate-500 mb-2">还没有添加宠物</p>
          <Link href="/pets/new" className="text-primary-600 hover:underline">立即添加第一只宠物 →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pets.map((pet) => (
            <div key={pet.id} className="card group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-2xl">
                    {pet.species === 'cat' ? '🐱' : '🐶'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{pet.name}</h3>
                    <p className="text-sm text-slate-500">{pet.breed} · {pet.gender === 'male' ? '公' : '母'}{pet.neutered ? ' · 已绝育' : ''}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link href={`/pets/${pet.id}`} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
                    <Edit size={16} />
                  </Link>
                  <button onClick={() => handleDelete(pet.id, pet.name)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm text-slate-500">体重</span>
                <span className="font-mono font-medium text-slate-900">{pet.weight_kg ? `${pet.weight_kg} kg` : '未记录'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
