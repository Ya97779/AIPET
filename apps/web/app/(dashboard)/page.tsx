'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { PawPrint, Stethoscope, ChefHat, TrendingUp, Plus } from 'lucide-react';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  weight_kg: number | null;
}

export default function DashboardPage() {
  const [pets, setPets] = useState<Pet[]>([]);

  useEffect(() => {
    apiGet<Pet[]>('/pets').then(setPets).catch(() => {});
  }, []);

  const quickLinks = [
    { href: '/consultation/image', label: '传图识病', desc: '拍照识别症状', icon: Stethoscope, color: 'from-red-500 to-pink-500', bg: 'bg-red-50' },
    { href: '/consultation', label: 'AI对话医生', desc: '多轮问诊分析', icon: Stethoscope, color: 'from-blue-500 to-indigo-500', bg: 'bg-blue-50' },
    { href: '/recipe', label: '智能食谱', desc: '精准营养配比', icon: ChefHat, color: 'from-green-500 to-emerald-500', bg: 'bg-green-50' },
    { href: '/pets', label: '宠物档案', desc: '健康管理看板', icon: PawPrint, color: 'from-purple-500 to-violet-500', bg: 'bg-purple-50' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">仪表盘</h1>
        <p className="text-slate-500 mt-1">欢迎回来，管理您的宠物健康</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="card hover:shadow-md transition-all group"
            >
              <div className={`w-12 h-12 ${link.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon size={24} className="text-slate-700" />
              </div>
              <h3 className="font-semibold text-slate-900">{link.label}</h3>
              <p className="text-sm text-slate-500 mt-1">{link.desc}</p>
            </Link>
          );
        })}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <PawPrint size={20} />
            我的宠物
          </h2>
          <Link href="/pets/new" className="btn-primary text-sm flex items-center gap-1.5">
            <Plus size={16} />
            添加宠物
          </Link>
        </div>

        {pets.length === 0 ? (
          <div className="text-center py-12">
            <PawPrint size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 mb-2">还没有添加宠物</p>
            <Link href="/pets/new" className="text-primary-600 hover:underline text-sm">
              立即添加第一只宠物 →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pets.map((pet) => (
              <Link
                key={pet.id}
                href={`/pets/${pet.id}`}
                className="border border-slate-200 rounded-xl p-4 hover:border-primary-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center text-lg">
                    {pet.species === 'cat' ? '🐱' : '🐶'}
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900">{pet.name}</h3>
                    <p className="text-sm text-slate-500">{pet.breed}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <TrendingUp size={14} className="text-slate-400" />
                  <span className="text-sm font-mono text-slate-600">
                    {pet.weight_kg ? `${pet.weight_kg} kg` : '未记录体重'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
