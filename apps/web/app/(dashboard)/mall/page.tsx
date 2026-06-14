'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { PointsProductCard } from '@/components/mall/product-card';
import { RecommendCard } from '@/components/mall/recommend-card';
import { Gift, Sparkles, History } from 'lucide-react';

type Tab = 'redeem' | 'recommend' | 'history';

interface PointsProduct { id: string; name: string; description: string | null; image_url: string | null; points_cost: number; stock: number; }
interface RecommendProduct { id: string; name: string; description: string | null; image_url: string | null; price: string | null; category: string | null; tags: string[]; }
interface Redemption { id: string; product_name: string; points_spent: number; status: string; created_at: string; }
interface PointsTx { id: string; amount: number; type: string; reason: string; created_at: string; }

export default function MallPage() {
  const [tab, setTab] = useState<Tab>('redeem');
  const [balance, setBalance] = useState(0);
  const [pointsProducts, setPointsProducts] = useState<PointsProduct[]>([]);
  const [recommendProducts, setRecommendProducts] = useState<RecommendProduct[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [transactions, setTransactions] = useState<PointsTx[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bal, prods, recs, hist] = await Promise.all([
        apiGet<{ balance: number; transactions: PointsTx[] }>('/mall/points/history'),
        apiGet<{ products: PointsProduct[] }>('/mall/points-products'),
        apiGet<{ products: RecommendProduct[] }>('/mall/recommend'),
        apiGet<{ redemptions: Redemption[] }>('/mall/redemptions'),
      ]);
      setBalance(bal.balance);
      setTransactions(bal.transactions);
      setPointsProducts(prods.products);
      setRecommendProducts(recs.products);
      setRedemptions(hist.redemptions);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">积分商城</h1>
          <p className="text-slate-500 mt-1">用积分兑换好礼</p>
        </div>
        <div className="card py-2 px-4 flex items-center gap-2">
          <Sparkles size={18} className="text-amber-500" />
          <span className="text-sm text-slate-600">我的积分：</span>
          <span className="text-lg font-bold text-primary-600">{balance}</span>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {([['redeem', '积分兑换', Gift], ['recommend', '为你推荐', Sparkles], ['history', '兑换记录', History]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key as Tab)}
            className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-colors ${
              tab === key ? 'bg-primary-100 text-primary-700 font-medium' : 'text-slate-500 hover:bg-slate-100'
            }`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : (
        <>
          {tab === 'redeem' && (
            pointsProducts.length === 0 ? (
              <div className="text-center py-12 text-slate-400">暂无商品</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pointsProducts.map(p => (
                  <PointsProductCard key={p.id} id={p.id} name={p.name} description={p.description}
                    imageUrl={p.image_url} pointsCost={p.points_cost} stock={p.stock}
                    userBalance={balance} onRedeem={fetchData} />
                ))}
              </div>
            )
          )}

          {tab === 'recommend' && (
            recommendProducts.length === 0 ? (
              <div className="text-center py-12 text-slate-400">暂无推荐</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendProducts.map(p => (
                  <RecommendCard key={p.id} name={p.name} description={p.description}
                    imageUrl={p.image_url} price={p.price} category={p.category} tags={p.tags} />
                ))}
              </div>
            )
          )}

          {tab === 'history' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-slate-900 mb-3">兑换记录</h3>
                {redemptions.length === 0 ? (
                  <p className="text-slate-400 text-sm">暂无兑换记录</p>
                ) : (
                  <div className="space-y-2">
                    {redemptions.map(r => (
                      <div key={r.id} className="card py-3 px-4 flex items-center justify-between">
                        <div>
                          <span className="font-medium text-slate-900">{r.product_name}</span>
                          <span className="text-xs text-slate-400 ml-3">{new Date(r.created_at).toLocaleDateString('zh-CN')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-red-500">-{r.points_spent} 积分</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            r.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                            r.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                          }`}>{r.status === 'completed' ? '已完成' : r.status === 'cancelled' ? '已取消' : '处理中'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-medium text-slate-900 mb-3">积分明细</h3>
                {transactions.length === 0 ? (
                  <p className="text-slate-400 text-sm">暂无积分记录</p>
                ) : (
                  <div className="space-y-2">
                    {transactions.map(t => (
                      <div key={t.id} className="card py-3 px-4 flex items-center justify-between">
                        <div>
                          <span className="text-sm text-slate-700">{
                            t.reason === 'answer_reward' ? '回答奖励' :
                            t.reason === 'bounty_reward' ? '悬赏收入' :
                            t.reason === 'question_cost' ? '悬赏支出' :
                            t.reason === 'signin' ? '每日签到' :
                            t.reason === 'initial' ? '初始积分' :
                            t.reason === 'redeem' ? '兑换商品' : t.reason
                          }</span>
                          <span className="text-xs text-slate-400 ml-3">{new Date(t.created_at).toLocaleDateString('zh-CN')}</span>
                        </div>
                        <span className={`font-medium ${t.amount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {t.amount > 0 ? '+' : ''}{t.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
