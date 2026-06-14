'use client';

import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { PetForm } from '@/components/pet/pet-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewPetPage() {
  const router = useRouter();

  const handleSubmit = async (data: any) => {
    await apiPost('/pets', {
      ...data,
      weight_kg: data.weight_kg ? parseFloat(data.weight_kg) : null,
    });
    router.push('/pets');
  };

  return (
    <div>
      <Link href="/pets" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft size={16} /> 返回宠物列表
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">添加宠物</h1>
      <div className="card max-w-2xl">
        <PetForm onSubmit={handleSubmit} submitLabel="创建档案" />
      </div>
    </div>
  );
}
