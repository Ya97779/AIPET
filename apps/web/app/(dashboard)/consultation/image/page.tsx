'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { streamSSE } from '@/lib/sse';
import { apiGet } from '@/lib/api';
import { Camera, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { RecommendCard } from '@/components/mall/recommend-card';

export default function ImageDiagnosisPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-slate-400">加载中...</div></div>}>
      <ImageDiagnosisContent />
    </Suspense>
  );
}

function ImageDiagnosisContent() {
  const searchParams = useSearchParams();
  const petId = searchParams.get('petId');
  const [text, setText] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const responseRef = useRef('');
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    apiGet<{ items: any[] }>('/consultation/history?type=image').then(d => setHistory(d.items || [])).catch(() => {});
  }, []);

  const fetchRecommendations = async (diagnosisText: string) => {
    try {
      const keywords = ['皮肤', '猫癣', '肠胃', '呕吐', '腹泻', '耳螨', '肥胖', '毛球', '寄生虫', '营养'];
      const matched = keywords.filter(kw => diagnosisText.includes(kw));
      if (matched.length > 0) {
        const data = await apiGet<{ products: any[] }>(`/mall/recommend?tags=${matched.join(',')}`);
        setRecommendations(data.products);
      }
    } catch {}
  };

  const handleSubmit = () => {
    if (!text || !petId || loading) return;

    const formData = new FormData();
    formData.append('pet_id', petId);
    formData.append('text', text);
    images.forEach(img => formData.append('images', img));

    setLoading(true);
    setResponse('');
    responseRef.current = '';
    setStatus('loading');

    streamSSE(
      '/api/consultation/image',
      formData,
      (chunk) => {
        responseRef.current += chunk;
        setResponse(prev => prev + chunk);
      },
      () => {
        setLoading(false);
        setStatus('done');
        fetchRecommendations(responseRef.current);
      },
      (err) => { setResponse(`诊断失败: ${err}`); setLoading(false); setStatus('error'); },
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">传图识病</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">上传信息</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">症状描述 *</label>
              <textarea value={text} onChange={e => setText(e.target.value)}
                className="input h-32 resize-none" placeholder="请详细描述宠物的症状，如：猫咪今天频繁舔舐肚子，肚子上红肿掉毛..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">上传图片（最多3张）</label>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-primary-400 transition-colors">
                <Camera size={32} className="mx-auto text-slate-400 mb-2" />
                <input type="file" accept="image/*" multiple
                  onChange={e => setImages(Array.from(e.target.files || []).slice(0, 3))}
                  className="w-full" />
                <p className="text-xs text-slate-400 mt-2">支持 JPG/PNG/WebP，单张最大 5MB</p>
              </div>
              {images.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {images.map((img, i) => (
                    <span key={i} className="text-xs bg-slate-100 px-2 py-1 rounded">{img.name}</span>
                  ))}
                </div>
              )}
            </div>
            <button onClick={handleSubmit} disabled={loading || !text}
              className="btn-primary w-full flex items-center justify-center gap-2">
              <Send size={18} />
              {loading ? 'AI分析中...' : '开始诊断'}
            </button>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">诊断结果</h2>
          {response ? (
            <div>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-slate-700 leading-relaxed">{response}</div>
              {status === 'done' && (
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle size={16} /> 诊断完成
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16">
              <Camera size={64} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400">上传图片并描述症状</p>
              <p className="text-sm text-slate-400 mt-1">AI将为您分析可能的病因</p>
            </div>
          )}
          {status === 'error' && (
            <div className="mt-4 flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle size={16} /> 诊断失败，请重试
            </div>
          )}
          {recommendations.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                🛒 为您推荐（基于诊断结果）
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recommendations.map(p => (
                  <RecommendCard key={p.id} name={p.name} description={p.description}
                    imageUrl={p.image_url} price={p.price} category={p.category} tags={p.tags} />
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">以上商品由AI根据诊断结果推荐，仅供参考</p>
            </div>
          )}
        </div>
      </div>

      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">历史诊断</h2>
          <div className="space-y-3">
            {history.map((item: any) => (
              <div key={item.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500">{new Date(item.created_at).toLocaleString('zh-CN')}</span>
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">传图识病</span>
                </div>
                <p className="text-sm text-slate-700 truncate">{item.input_text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
