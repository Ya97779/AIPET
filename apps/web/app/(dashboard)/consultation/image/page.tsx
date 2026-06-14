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
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const responseRef = useRef('');
  const [history, setHistory] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ items: any[] }>('/consultation/history?type=image').then(d => setHistory(d.items || [])).catch(() => {});
  }, []);

  const fetchRecommendations = async (diagnosisText: string) => {
    try {
      // Extract tags from AI response line: "6. 推荐商品标签：耳朵,耳螨,甩头"
      const tagMatch = diagnosisText.match(/推荐商品标签[：:]\s*(.+)/);
      let tags: string[] = [];
      if (tagMatch) {
        tags = tagMatch[1].split(/[,，、\s]+/).map(t => t.trim()).filter(Boolean);
      }
      // Fallback: extract from known keywords if AI didn't output tags
      if (tags.length === 0) {
        const allTags = ['皮肤', '猫癣', '真菌', '脱毛', '瘙痒', '红肿', '过敏', '术后', '防舔', '肠胃', '呕吐', '腹泻', '软便', '消化', '处方', '寄生虫', '跳蚤', '蜱虫', '肥胖', '超重', '减肥', '毛球', '营养', '体弱', '术后恢复', '耳朵', '耳螨', '甩头', '异味', '眼睛', '眼部', '流泪', '口腔', '口臭', '呼吸道'];
        tags = allTags.filter(t => diagnosisText.includes(t));
      }
      if (tags.length > 0) {
        const data = await apiGet<{ products: any[] }>(`/mall/recommend?tags=${tags.join(',')}`);
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
                  onChange={e => {
                    const files = Array.from(e.target.files || []).slice(0, 3);
                    setImages(files);
                    setImagePreviews(files.map(f => URL.createObjectURL(f)));
                  }}
                  className="w-full" />
                <p className="text-xs text-slate-400 mt-2">支持 JPG/PNG/WebP，单张最大 5MB</p>
              </div>
              {imagePreviews.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {imagePreviews.map((src, i) => (
                    <img key={i} src={src} alt={`预览 ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
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
              <div key={item.id} className="card cursor-pointer hover:shadow-md transition-all" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500">{new Date(item.created_at).toLocaleString('zh-CN')}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">传图识病</span>
                    <span className="text-xs text-slate-400">{expandedId === item.id ? '收起' : '展开'}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-1">症状：{item.input_text}</p>
                {item.input_images && item.input_images.length > 0 && (
                  <div className="flex gap-2 mb-2">
                    {item.input_images.map((img: string, i: number) => (
                      <img key={i} src={img} alt={`诊断图片 ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                    ))}
                  </div>
                )}
                <p className={`text-sm text-slate-700 whitespace-pre-wrap ${expandedId === item.id ? '' : 'line-clamp-3'}`}>{item.ai_response?.diagnosis || '无诊断结果'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
