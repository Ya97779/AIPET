'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { Upload, FileText, AlertTriangle, CheckCircle, ArrowDown } from 'lucide-react';

interface Pet { id: string; name: string; species: string; }

function LabReportContent() {
  const searchParams = useSearchParams();
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState(searchParams.get('petId') || '');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [result, setResult] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Pet[]>('/pets').then(setPets);
    apiGet<{ items: any[] }>('/consultation/history?type=lab_report').then(d => setHistory(d.items || [])).catch(() => {});
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setResult('');
  };

  const handleAnalyze = async () => {
    if (!selectedPet || !image || analyzing) return;
    setAnalyzing(true);
    setResult('');
    setStatusText('正在读取宠物档案...');

    const formData = new FormData();
    formData.append('pet_id', selectedPet);
    formData.append('image', image);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/consultation/lab-report', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok || !res.body) throw new Error('分析失败');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'status') setStatusText(data.content);
            else if (data.type === 'text') { fullText += data.content; setResult(fullText); }
          } catch {}
        }
      }
    } catch (e: any) {
      setResult(`分析失败：${e.message || '请重试'}`);
    } finally { setAnalyzing(false); setStatusText(''); }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">化验单解读</h1>
        <p className="text-slate-500 mt-1">上传化验单图片，AI为您解读</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="card">
            <label className="block text-sm font-medium text-slate-700 mb-2">选择宠物（可选）</label>
            <select value={selectedPet} onChange={e => setSelectedPet(e.target.value)} className="input">
              <option value="">不选择宠物</option>
              {pets.map(p => <option key={p.id} value={p.id}>{p.name} ({p.species === 'cat' ? '猫' : '狗'})</option>)}
            </select>
          </div>

          <div className="card">
            <label className="block text-sm font-medium text-slate-700 mb-2">上传化验单</label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-primary-400 transition-colors cursor-pointer"
              onClick={() => document.getElementById('lab-input')?.click()}>
              {imagePreview ? (
                <img src={imagePreview} alt="化验单预览" className="max-h-64 mx-auto rounded-lg" />
              ) : (
                <div>
                  <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-sm text-slate-500">点击上传化验单图片</p>
                  <p className="text-xs text-slate-400 mt-1">支持 jpg/png</p>
                </div>
              )}
            </div>
            <input id="lab-input" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </div>

          <button onClick={handleAnalyze} disabled={!image || analyzing}
            className="btn-primary w-full flex items-center justify-center gap-2">
            <FileText size={18} />
            {analyzing ? statusText || '分析中...' : '开始解读'}
          </button>
        </div>

        <div>
          {analyzing && !result && (
            <div className="card text-center py-12">
              <div className="animate-pulse">
                <FileText size={48} className="mx-auto text-primary-300 mb-4" />
                <p className="text-slate-600 font-medium">{statusText}</p>
                <p className="text-sm text-slate-400 mt-2">AI 正在分析化验单，请稍候...</p>
              </div>
            </div>
          )}

          {result && (
            <div className="card">
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-slate-700 leading-relaxed">{result}</div>
              {!analyzing && (
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle size={16} /> 解读完成
                </div>
              )}
            </div>
          )}

          {!analyzing && !result && (
            <div className="card text-center py-12 text-slate-400">
              <ArrowDown size={32} className="mx-auto mb-2 opacity-50" />
              <p>上传化验单后，解读结果将在此显示</p>
            </div>
          )}
        </div>
      </div>

      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">历史化验单</h2>
          <div className="space-y-3">
            {history.map((item: any) => (
              <div key={item.id} className="card cursor-pointer hover:shadow-md transition-all" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-900">{item.input_text || '化验单解读'}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString('zh-CN')}</span>
                    <span className="text-xs text-slate-400">{expandedId === item.id ? '收起' : '展开'}</span>
                  </div>
                </div>
                {expandedId === item.id && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.ai_response?.raw || '无解读结果'}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LabReportPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-slate-400">加载中...</div>}>
      <LabReportContent />
    </Suspense>
  );
}
