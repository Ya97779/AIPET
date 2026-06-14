'use client';

import { ThumbsUp, CheckCircle } from 'lucide-react';
import { apiPost } from '@/lib/api';

interface AnswerCardProps {
  id: string; content: string; isAccepted: boolean; likeCount: number; likedByMe: boolean;
  author: { id: string; nickname: string | null }; createdAt: string;
  isQuestionOwner: boolean; questionStatus: string;
  onAccept?: () => void; onLike?: () => void;
}

export function AnswerCard({
  id, content, isAccepted, likeCount, likedByMe,
  author, createdAt, isQuestionOwner, questionStatus, onAccept, onLike,
}: AnswerCardProps) {
  const handleLike = async () => {
    try { await apiPost(`/community/answers/${id}/like`); onLike?.(); } catch {}
  };

  const handleAccept = async () => {
    try { await apiPost(`/community/answers/${id}/accept`); onAccept?.(); } catch {}
  };

  return (
    <div className={`card ${isAccepted ? 'ring-2 ring-emerald-400 bg-emerald-50/30' : ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-sm font-medium text-slate-600">
          {(author.nickname || '?')[0]}
        </div>
        <span className="text-sm font-medium text-slate-900">{author.nickname || '匿名用户'}</span>
        {isAccepted && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <CheckCircle size={14} /> 已采纳
          </span>
        )}
        <span className="text-xs text-slate-400 ml-auto">{new Date(createdAt).toLocaleDateString('zh-CN')}</span>
      </div>
      <p className="text-slate-700 whitespace-pre-wrap mb-4">{content}</p>
      <div className="flex items-center gap-3">
        <button onClick={handleLike} disabled={likedByMe}
          className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg transition-colors ${
            likedByMe ? 'bg-primary-50 text-primary-600' : 'text-slate-500 hover:bg-slate-100'
          }`}>
          <ThumbsUp size={14} /> {likeCount}
        </button>
        {isQuestionOwner && !isAccepted && questionStatus !== 'answered' && (
          <button onClick={handleAccept}
            className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
            <CheckCircle size={14} /> 采纳
          </button>
        )}
      </div>
    </div>
  );
}
