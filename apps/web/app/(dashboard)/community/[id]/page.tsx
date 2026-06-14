'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { AnswerCard } from '@/components/community/answer-card';
import { Award, Eye, MessageCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const categoryLabels: Record<string, string> = {
  disease: '疾病咨询', nutrition: '营养喂养', behavior: '行为训练', daily: '日常护理', other: '其他',
};

interface Author { id: string; nickname: string | null; avatar_url: string | null; }
interface Answer {
  id: string; content: string; image_urls: string[]; is_accepted: boolean;
  like_count: number; liked_by_me: boolean; author: Author; created_at: string;
}
interface QuestionDetail {
  id: string; title: string; content: string; image_urls: string[]; category: string;
  bounty_points: number; status: string; view_count: number; answer_count: number;
  accepted_answer_id: string | null; author: Author;
  pet: { name: string; species: string; breed: string } | null;
  answers: Answer[]; created_at: string;
}

export default function QuestionDetailPage() {
  const { id } = useParams();
  const user = getUser();
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [answerContent, setAnswerContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchQuestion = async () => {
    try { const data = await apiGet<QuestionDetail>(`/community/questions/${id}`); setQuestion(data); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchQuestion(); }, [id]);

  const handleAnswer = async () => {
    if (!answerContent.trim() || answerContent.length < 10) return;
    setSubmitting(true);
    try {
      await apiPost(`/community/questions/${id}/answers`, { content: answerContent });
      setAnswerContent('');
      await fetchQuestion();
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="text-center py-12 text-slate-400">加载中...</div>;
  if (!question) return <div className="text-center py-12 text-slate-400">问题不存在</div>;

  const isOwner = user?.id === question.author.id;

  return (
    <div className="max-w-3xl">
      <Link href="/community" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft size={16} /> 返回社区
      </Link>

      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{categoryLabels[question.category]}</span>
          {question.bounty_points > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 flex items-center gap-1">
              <Award size={12} /> 悬赏 {question.bounty_points} 积分
            </span>
          )}
          {question.status === 'answered' && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">已解决</span>}
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-3">{question.title}</h1>
        <div className="flex items-center gap-3 mb-4 text-sm text-slate-500">
          <span>{question.author.nickname || '匿名用户'}</span>
          <span className="flex items-center gap-1"><Eye size={14} /> {question.view_count}</span>
          <span className="flex items-center gap-1"><MessageCircle size={14} /> {question.answer_count}</span>
          <span>{new Date(question.created_at).toLocaleString('zh-CN')}</span>
        </div>
        {question.pet && (
          <div className="mb-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
            关联宠物：{question.pet.name}（{question.pet.species === 'cat' ? '猫' : '狗'} · {question.pet.breed}）
          </div>
        )}
        <p className="text-slate-700 whitespace-pre-wrap">{question.content}</p>
      </div>

      <h2 className="text-lg font-semibold text-slate-900 mb-4">回答 ({question.answers.length})</h2>
      {question.answers.length === 0 ? (
        <div className="text-center py-8 text-slate-400 mb-6">暂无回答，快来抢答</div>
      ) : (
        <div className="space-y-3 mb-6">
          {question.answers.map(a => (
            <AnswerCard key={a.id} {...a} isQuestionOwner={isOwner} questionStatus={question.status}
              onAccept={fetchQuestion} onLike={fetchQuestion} />
          ))}
        </div>
      )}

      <div className="card">
        <h3 className="font-medium text-slate-900 mb-3">我来回答</h3>
        <textarea value={answerContent} onChange={e => setAnswerContent(e.target.value)}
          className="input min-h-[100px] mb-3" placeholder="分享你的经验（10-2000字）" maxLength={2000} />
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">回答即可获得 20 积分</p>
          <button onClick={handleAnswer} disabled={submitting || answerContent.length < 10} className="btn-primary">
            {submitting ? '提交中...' : '提交回答'}
          </button>
        </div>
      </div>
    </div>
  );
}
