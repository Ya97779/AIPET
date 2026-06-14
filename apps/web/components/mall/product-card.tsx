'use client';

import { apiPost } from '@/lib/api';

interface PointsProductCardProps {
  id: string; name: string; description: string | null; imageUrl: string | null;
  pointsCost: number; stock: number; userBalance: number; onRedeem?: () => void;
}

export function PointsProductCard({ id, name, description, imageUrl, pointsCost, stock, userBalance, onRedeem }: PointsProductCardProps) {
  const canRedeem = userBalance >= pointsCost && stock > 0;

  const handleRedeem = async () => {
    if (!canRedeem) return;
    try { await apiPost('/mall/redeem', { product_id: id }); onRedeem?.(); } catch {}
  };

  return (
    <div className="card flex flex-col">
      <div className="w-full h-32 bg-slate-100 rounded-lg mb-3 flex items-center justify-center text-slate-400 text-4xl">
        {imageUrl ? <img src={imageUrl} alt={name} className="w-full h-full object-cover rounded-lg" /> : '🎁'}
      </div>
      <h3 className="font-medium text-slate-900 mb-1">{name}</h3>
      <p className="text-xs text-slate-500 mb-3 flex-1">{description || ''}</p>
      <div className="flex items-center justify-between mb-3">
        <span className="text-primary-600 font-bold">{pointsCost} 积分</span>
        <span className="text-xs text-slate-400">库存 {stock}</span>
      </div>
      <button onClick={handleRedeem} disabled={!canRedeem} className="btn-primary w-full text-sm">
        {!canRedeem && stock <= 0 ? '已售罄' : !canRedeem ? '积分不足' : '立即兑换'}
      </button>
    </div>
  );
}
