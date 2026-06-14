'use client';

import Link from 'next/link';
import { MessageCircle, Eye, Award } from 'lucide-react';

const categoryLabels: Record<string, string> = {
  disease: '疾病咨询', nutrition: '营养喂养', behavior: '行为训练', daily: '日常护理', other: '其他',
};

const categoryColors: Record<string, string> = {
  disease: 'bg-red-50 text-red-700', nutrition: 'bg-green-50 text-green-700',
  behavior: 'bg-purple-50 text-purple-700', daily: 'bg-blue-50 text-blue-700', other: 'bg-slate-50 text-slate-700',
};

interface QuestionCardProps {
  id: string; title: string; category: string; bounty_points: number;
  status: string; view_count: number; answer_count: number;
  author: { nickname: string | null }; created_at: string;
}

export function QuestionCard({ id, title, category, bounty_points, status, view_count, answer_count, author, created_at }: QuestionCardProps) {
  return (
    <Link href={`/community/${id}`} className="card hover:shadow-md transition-all block">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[category] || categoryColors.other}`}>
              {categoryLabels[category] || category}
            </span>
            {bounty_points > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 flex items-center gap-1">
                <Award size={12} /> 悬赏 {bounty_points} 积分
              </span>
            )}
            {status === 'answered' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">已解决</span>
            )}
          </div>
          <h3 className="font-medium text-slate-900 truncate">{title}</h3>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
            <span>{author.nickname || '匿名用户'}</span>
            <span className="flex items-center gap-1"><Eye size={12} /> {view_count}</span>
            <span className="flex items-center gap-1"><MessageCircle size={12} /> {answer_count}</span>
            <span>{new Date(created_at).toLocaleDateString('zh-CN')}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
