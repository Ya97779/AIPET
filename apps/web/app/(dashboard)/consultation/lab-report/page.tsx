'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { Upload, FileText, AlertTriangle, CheckCircle, ArrowDown } from 'lucide-react';

interface Pet { id: string; name: string; species: string; }
interface Indicator { name: string; value: string; reference_range: string; status: 'high' | 'normal' | 'low'; interpretation: string; }
interface LabResult { indicators: Indicator[]; summary: string; suggestions: string[]; urgency: string; error?: string; }

const statusColor = { high: 'text-red-600 bg-red-50', low: 'text-blue-600 bg-blue-50', normal: 'text-emerald-600 bg-emerald-50' };
const statusLabel = { high: '↑ 偏高', low: '↓ 偏低', normal: '正常' };
const urgencyColor = { normal: 'bg-emerald-50 text-emerald-700', warning: 'bg-amber-50 text-amber-700', critical: 'bg-red-50 text-red-700' };
const urgencyLabel = { normal: '正常', warning: '需关注', critical: '紧急' };

function LabReportContent() {
  const searchParams = useSearchParams();
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState(searchParams.get('petId') || '');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [rawOutput, setRawOutput] = useState('');
  const [result, setResult] = useState<LabResult | null>(null);

  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    apiGet<Pet[]>('/pets').then(setPets);
    apiGet<{ items: any[] }>('/consultation/history?type=lab_report').then(d => setHistory(d.items || [])).catch(() => {});
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setResult(null);
    setRawOutput('');
  };

  const handleAnalyze = async () => {
    if (!selectedPet || !image || analyzing) return;
    setAnalyzing(true);
    setRawOutput('');
    setResult(null);
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
            else if (data.type === 'text') { fullText += data.content; setRawOutput(fullText); }
          } catch {}
        }
      }

      try {
        const parsed = JSON.parse(fullText);
        if (parsed.error) {
          setResult({ indicators: [], summary: '', suggestions: [], urgency: 'normal', error: parsed.error });
        } else {
          setResult(parsed);
        }
      } catch {
        setResult({ indicators: [], summary: fullText, suggestions: [], urgency: 'normal' });
      }
    } catch (e: any) {
      setResult({ indicators: [], summary: '', suggestions: [], urgency: 'normal', error: e.message || '分析失败' });
    } finally { setAnalyzing(false); setStatusText(''); }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">化验单解读</h1>
        <p className="text-slate-500 mt-1">上传化验单图片，AI为您结构化解读</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="card">
            <label className="block text-sm font-medium text-slate-700 mb-2">选择宠物</label>
            <select value={selectedPet} onChange={e => setSelectedPet(e.target.value)} className="input">
              <option value="">请选择宠物</option>
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
                  <p className="text-sm text-slate-500">点击或拖拽上传化验单图片</p>
                  <p className="text-xs text-slate-400 mt-1">支持 jpg/png，最大 10MB</p>
                </div>
              )}
            </div>
            <input id="lab-input" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </div>

          <button onClick={handleAnalyze} disabled={!selectedPet || !image || analyzing}
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

          {result?.error && (
            <div className="card bg-red-50 border-red-200">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle size={20} />
                <span className="font-medium">{result.error}</span>
              </div>
            </div>
          )}

          {result && !result.error && result.indicators.length > 0 && (
            <div className="space-y-4">
              <div className={`card flex items-center gap-2 ${urgencyColor[result.urgency as keyof typeof urgencyColor] || urgencyColor.normal}`}>
                <AlertTriangle size={18} />
                <span className="font-medium">整体评估：{urgencyLabel[result.urgency as keyof typeof urgencyLabel] || '正常'}</span>
              </div>

              <div className="card overflow-x-auto">
                <h3 className="font-semibold text-slate-900 mb-3">检测指标</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 pr-3 font-medium text-slate-600">指标</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">测定值</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">参考范围</th>
                      <th className="text-center py-2 px-3 font-medium text-slate-600">状态</th>
                      <th className="text-left py-2 pl-3 font-medium text-slate-600">释义</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.indicators.map((ind, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-2.5 pr-3 font-medium text-slate-800">{ind.name}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{ind.value}</td>
                        <td className="py-2.5 px-3 text-right text-slate-500">{ind.reference_range}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[ind.status] || statusColor.normal}`}>
                            {statusLabel[ind.status] || ind.status}
                          </span>
                        </td>
                        <td className="py-2.5 pl-3 text-slate-600 text-xs">{ind.interpretation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {result.summary && (
                <div className="card">
                  <h3 className="font-semibold text-slate-900 mb-2">综合分析</h3>
                  <p className="text-slate-700 text-sm whitespace-pre-wrap">{result.summary}</p>
                </div>
              )}

              {result.suggestions.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-slate-900 mb-2">建议</h3>
                  <ul className="space-y-1">
                    {result.suggestions.map((s, i) => (
                      <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                        <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                <p className="text-xs text-red-700 font-medium">
                  ⚠️ 重要提示：本报告由AI深度学习技术生成，仅供居家护理参考，不能替代执业兽医师的面对面临床诊断。如宠物症状加重或出现异常，请立即前往最近的宠物医院就诊。
                </p>
              </div>
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
              <div key={item.id} className="card">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{item.input_text || '化验单解读'}</span>
                  <span className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString('zh-CN')}</span>
                </div>
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
