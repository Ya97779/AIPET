'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { getUser } from '@/lib/auth';

const categories = [
  { value: 'disease', label: '疾病咨询' }, { value: 'nutrition', label: '营养喂养' },
  { value: 'behavior', label: '行为训练' }, { value: 'daily', label: '日常护理' }, { value: 'other', label: '其他' },
];

interface Pet { id: string; name: string; }

export default function NewQuestionPage() {
  const router = useRouter();
  const user = getUser();
  const [pets, setPets] = useState<Pet[]>([]);
  const [balance, setBalance] = useState(user?.points_balance || 0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('disease');
  const [petId, setPetId] = useState('');
  const [useBounty, setUseBounty] = useState(false);
  const [bountyPoints, setBountyPoints] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet<Pet[]>('/pets').then(setPets);
    apiGet<{ balance: number }>('/mall/points/history').then(d => setBalance(d.balance));
  }, []);

  const handleSubmit = async () => {
    if (!title.trim() || title.length < 5) { setError('标题至少5个字'); return; }
    if (!content.trim() || content.length < 10) { setError('内容至少10个字'); return; }
    if (useBounty && bountyPoints <= 0) { setError('悬赏积分必须大于0'); return; }
    if (useBounty && bountyPoints > balance) { setError('积分不足'); return; }

    setSubmitting(true); setError('');
    try {
      await apiPost('/community/questions', {
        title, content, category, pet_id: petId || null,
        bounty_points: useBounty ? bountyPoints : 0,
      });
      router.push('/community');
    } catch (e: any) { setError(e.message || '发布失败'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">发布问题</h1>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">标题</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="简要描述你的问题（5-100字）" maxLength={100} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">分类</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="input max-w-xs">
            {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">关联宠物（可选）</label>
          <select value={petId} onChange={e => setPetId(e.target.value)} className="input max-w-xs">
            <option value="">不关联</option>
            {pets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">问题详情</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} className="input min-h-[150px]" placeholder="详细描述你的问题（10-2000字）" maxLength={2000} />
        </div>
        <div className="card bg-amber-50 border-amber-200">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={useBounty} onChange={e => setUseBounty(e.target.checked)} className="w-4 h-4 rounded" />
            <span className="text-sm font-medium text-slate-700">设置悬赏积分</span>
          </label>
          {useBounty && (
            <div className="mt-3">
              <p className="text-xs text-slate-500 mb-2">当前余额：{balance} 积分</p>
              <input type="number" value={bountyPoints || ''} onChange={e => setBountyPoints(Number(e.target.value))}
                className="input max-w-[200px]" min={1} max={balance} placeholder="悬赏积分" />
              <p className="text-xs text-slate-400 mt-1">回答被采纳后，悬赏积分将转给回答者</p>
            </div>
          )}
        </div>
        <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
          {submitting ? '发布中...' : '发布问题'}
        </button>
      </div>
    </div>
  );
}
