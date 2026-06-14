'use client';

interface RecommendCardProps {
  name: string; description: string | null; imageUrl: string | null;
  price: string | null; category: string | null; tags: string[];
}

const categoryIcon: Record<string, string> = { medicine: '💊', food: '🍖', tool: '🔧', other: '📦' };

export function RecommendCard({ name, description, imageUrl, price, category, tags }: RecommendCardProps) {
  return (
    <div className="card flex flex-col">
      <div className="w-full h-32 bg-slate-100 rounded-lg mb-3 flex items-center justify-center text-slate-400 text-4xl">
        {imageUrl ? <img src={imageUrl} alt={name} className="w-full h-full object-cover rounded-lg" /> : (categoryIcon[category || 'other'] || '📦')}
      </div>
      <h3 className="font-medium text-slate-900 mb-1">{name}</h3>
      <p className="text-xs text-slate-500 mb-3 flex-1">{description || ''}</p>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-red-500">{price || '—'}</span>
        <div className="flex gap-1">
          {tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
