interface FoodItem { name: string; amount_g: number; }

interface RecipeData {
  daily_calories: number;
  food_items: {
    main_food?: { name: string; amount_g: number };
    supplements?: FoodItem[];
    nutrition_ratio?: { protein: number; fat: number; carb: number };
    raw_response?: string;
  };
  rer?: number;
  factor?: number;
}

export function RecipeCard({ recipe }: { recipe: RecipeData }) {
  const { food_items } = recipe;

  if (food_items.raw_response) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">食谱建议</h3>
        <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">{food_items.raw_response}</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">今日食谱</h3>
        <div className="text-right">
          <span className="text-3xl font-bold font-mono text-primary-600">{recipe.daily_calories}</span>
          <span className="text-sm text-slate-500 ml-1">kcal/日</span>
        </div>
      </div>

      {food_items.main_food && (
        <div className="mb-5">
          <h4 className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-1.5">🥩 主食</h4>
          <div className="flex justify-between items-center py-3 px-4 bg-slate-50 rounded-xl">
            <span className="font-medium text-slate-900">{food_items.main_food.name}</span>
            <span className="font-mono font-semibold text-slate-900">{food_items.main_food.amount_g}g</span>
          </div>
        </div>
      )}

      {food_items.supplements && food_items.supplements.length > 0 && (
        <div className="mb-5">
          <h4 className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-1.5">🥗 自制辅食</h4>
          <div className="space-y-2">
            {food_items.supplements.map((item, i) => (
              <div key={i} className="flex justify-between items-center py-3 px-4 bg-slate-50 rounded-xl">
                <span className="text-slate-900">{item.name}</span>
                <span className="font-mono font-medium text-slate-700">{item.amount_g}g</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {food_items.nutrition_ratio && (
        <div>
          <h4 className="text-sm font-medium text-slate-500 mb-3">📈 营养配比</h4>
          <div className="flex gap-3">
            <div className="flex-1 text-center py-3 bg-blue-50 rounded-xl">
              <div className="text-lg font-bold font-mono text-blue-700">{food_items.nutrition_ratio.protein}%</div>
              <div className="text-xs text-blue-500">蛋白质</div>
            </div>
            <div className="flex-1 text-center py-3 bg-amber-50 rounded-xl">
              <div className="text-lg font-bold font-mono text-amber-700">{food_items.nutrition_ratio.fat}%</div>
              <div className="text-xs text-amber-500">脂肪</div>
            </div>
            <div className="flex-1 text-center py-3 bg-green-50 rounded-xl">
              <div className="text-lg font-bold font-mono text-green-700">{food_items.nutrition_ratio.carb}%</div>
              <div className="text-xs text-green-500">碳水</div>
            </div>
          </div>
        </div>
      )}

      {recipe.rer && recipe.factor && (
        <div className="mt-5 pt-4 border-t border-slate-100 text-sm text-slate-400">
          <span>RER: {recipe.rer} kcal</span>
          <span className="mx-2">·</span>
          <span>系数: {recipe.factor}</span>
        </div>
      )}
    </div>
  );
}
