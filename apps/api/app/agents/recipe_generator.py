from app.core.zhipu_client import chat_completion


def calculate_rer(weight_kg: float) -> float:
    """Calculate Resting Energy Requirement."""
    return 70 * (weight_kg ** 0.75)


def calculate_mer(rer: float, factor: float) -> float:
    """Calculate Maintenance Energy Requirement."""
    return rer * factor


def get_life_stage_factor(species: str, birthday, neutered: bool, is_overweight: bool = False) -> float:
    """Get factor based on pet's life stage."""
    if is_overweight:
        return 1.0

    from datetime import date
    if birthday:
        age_years = (date.today() - birthday).days / 365.25
    else:
        age_years = 3  # default adult

    if age_years < 1:
        return 2.5  # puppy/kitten
    elif age_years > 10:
        return 1.1  # senior
    elif neutered:
        return 1.3  # adult neutered
    else:
        return 1.5  # adult intact


RECIPE_PROMPT = """根据以下信息生成宠物每日食谱：

- 宠物种类：{species}
- 宠物品种：{breed}
- 每日能量需求：{mer:.0f} kcal
- 过敏史：{allergies}

请生成一个具体的每日食谱，包含：
1. 主食（干粮）的克数
2. 自制辅食（2-3种食材及克数）
3. 营养配比（蛋白质/脂肪/碳水的百分比）

请用JSON格式输出，格式如下：
{{
  "main_food": {{"name": "猫粮/狗粮", "amount_g": 65}},
  "supplements": [
    {{"name": "鸡胸肉", "amount_g": 30}},
    {{"name": "西兰花", "amount_g": 10}}
  ],
  "nutrition_ratio": {{"protein": 45, "fat": 35, "carb": 20}}
}}"""


async def generate_recipe(
    species: str,
    breed: str,
    weight_kg: float,
    birthday,
    neutered: bool,
    allergies: list[str],
) -> dict:
    """Generate a pet recipe using RER/MER calculation + AI."""
    rer = calculate_rer(weight_kg)
    factor = get_life_stage_factor(species, birthday, neutered)
    mer = calculate_mer(rer, factor)

    allergies_str = "、".join(allergies) if allergies else "无"

    prompt = RECIPE_PROMPT.format(
        species=species,
        breed=breed,
        mer=mer,
        allergies=allergies_str,
    )

    response = await chat_completion(
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )

    # Parse JSON from response
    import json
    try:
        start = response.find("{")
        end = response.rfind("}") + 1
        if start >= 0 and end > start:
            food_items = json.loads(response[start:end])
        else:
            food_items = {"raw_response": response}
    except json.JSONDecodeError:
        food_items = {"raw_response": response}

    return {
        "daily_calories": round(mer, 2),
        "food_items": food_items,
        "rer": round(rer, 2),
        "factor": factor,
    }
