'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { QuestionCard } from '@/components/community/question-card';
import { Plus } from 'lucide-react';

const categories = [
  { value: '', label: '全部' }, { value: 'disease', label: '疾病咨询' },
  { value: 'nutrition', label: '营养喂养' }, { value: 'behavior', label: '行为训练' },
  { value: 'daily', label: '日常护理' }, { value: 'other', label: '其他' },
];

const sorts = [
  { value: 'latest', label: '最新' }, { value: 'hottest', label: '最热' }, { value: 'unanswered', label: '待回答' },
];

interface Question {
  id: string; title: string; category: string; bounty_points: number;
  status: string; view_count: number; answer_count: number;
  author: { nickname: string | null }; created_at: string;
}

export default function CommunityPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('latest');
  const [loading, setLoading] = useState(true);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      params.set('sort', sort);
      const data = await apiGet<{ questions: Question[]; total: number }>(`/community/questions?${params}`);
      setQuestions(data.questions);
      setTotal(data.total);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchQuestions(); }, [category, sort]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">社区互助</h1>
          <p className="text-slate-500 mt-1">提问求助，分享经验</p>
        </div>
        <Link href="/community/new" className="btn-primary flex items-center gap-2">
          <Plus size={18} /> 我要提问
        </Link>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex gap-2">
          {categories.map(c => (
            <button key={c.value} onClick={() => setCategory(c.value)}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                category === c.value ? 'bg-primary-100 text-primary-700 font-medium' : 'text-slate-500 hover:bg-slate-100'
              }`}>{c.label}</button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          {sorts.map(s => (
            <button key={s.value} onClick={() => setSort(s.value)}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                sort === s.value ? 'bg-slate-200 text-slate-800 font-medium' : 'text-slate-400 hover:bg-slate-100'
              }`}>{s.label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12 text-slate-400">暂无问题，快来提问吧</div>
      ) : (
        <div className="space-y-3">
          {questions.map(q => <QuestionCard key={q.id} {...q} />)}
        </div>
      )}
      <div className="mt-4 text-sm text-slate-400 text-center">共 {total} 条</div>
    </div>
  );
}
