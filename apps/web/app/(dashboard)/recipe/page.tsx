'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { RecipeCard } from '@/components/recipe/recipe-card';
import { ChefHat, Loader2, PawPrint } from 'lucide-react';

interface Pet { id: string; name: string; species: string; weight_kg: number | null; }

export default function RecipePage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState('');
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { apiGet<Pet[]>('/pets').then(setPets); }, []);

  const handleGenerate = async () => {
    if (!selectedPet || loading) return;
    setLoading(true);
    setError('');
    setRecipe(null);

    try {
      const data = await apiPost('/recipe/generate', { pet_id: selectedPet });
      if ((data as any).error) { setError((data as any).error); }
      else { setRecipe(data); }
    } catch { setError('生成食谱失败，请重试'); }
    finally { setLoading(false); }
  };

  const selectedPetData = pets.find(p => p.id === selectedPet);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">智能食谱</h1>
        <p className="text-slate-500 mt-1">根据宠物体重和健康状况，AI生成精准营养配比</p>
      </div>

      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">选择宠物</label>
            <select value={selectedPet} onChange={e => { setSelectedPet(e.target.value); setRecipe(null); }}
              className="input">
              <option value="">请选择宠物</option>
              {pets.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.weight_kg ? `(${p.weight_kg}kg)` : '(未记录体重)'}
                </option>
              ))}
            </select>
          </div>
          <button onClick={handleGenerate} disabled={loading || !selectedPet}
            className="btn-primary flex items-center gap-2 whitespace-nowrap">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ChefHat size={18} />}
            {loading ? '生成中...' : '生成食谱'}
          </button>
        </div>
        {selectedPetData && !selectedPetData.weight_kg && (
          <p className="text-sm text-amber-600 mt-2">⚠️ 该宠物未记录体重，请先在宠物档案中录入体重</p>
        )}
        {error && (
          <p className="text-sm text-red-600 mt-2">{error}</p>
        )}
      </div>

      {recipe && <RecipeCard recipe={recipe} />}

      {!recipe && !loading && (
        <div className="card text-center py-16">
          <ChefHat size={64} className="mx-auto text-slate-200 mb-4" />
          <p className="text-lg text-slate-500 mb-2">选择宠物并点击"生成食谱"</p>
          <p className="text-sm text-slate-400">AI将根据宠物的体重、品种和健康状况生成专属食谱</p>
        </div>
      )}
    </div>
  );
}
