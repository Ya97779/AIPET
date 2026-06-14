from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.pet import Pet
from app.core.zhipu_client import vision_completion_stream


LAB_REPORT_PROMPT = """你是一位专业的宠物化验单解读助手。请分析这张化验单图片，提取所有检测指标并解读。

宠物档案信息：
{pet_context}

请严格按照以下JSON格式输出，不要输出任何其他内容：
{{
  "indicators": [
    {{
      "name": "WBC（白细胞）",
      "value": "18.5",
      "reference_range": "5.5-16.9 ×10⁹/L",
      "status": "high",
      "interpretation": "提示可能存在细菌性感染或急性炎症"
    }}
  ],
  "summary": "综合来看，该宠物白细胞偏高，建议关注是否有感染症状...",
  "suggestions": ["建议3天内复查血常规", "观察是否有发烧、食欲下降等症状"],
  "urgency": "warning"
}}

字段说明：
- status: "high"(偏高) / "normal"(正常) / "low"(偏低)
- urgency: "normal"(正常) / "warning"(需关注) / "critical"(紧急)
- 参考范围使用犬/猫通用标准
- 如果图片模糊或无法识别，返回 {{"error": "图片不清晰，请重新拍摄"}}
- 如果不是化验单，返回 {{"error": "未检测到化验单内容"}}"""


class LabReportAgent:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_pet_context(self, pet_id: str) -> str:
        result = await self.db.execute(select(Pet).where(Pet.id == pet_id))
        pet = result.scalar_one_or_none()
        if not pet:
            return "未提供宠物档案"
        species_cn = "猫" if pet.species == "cat" else "狗"
        return f"品种：{pet.breed}，物种：{species_cn}，年龄：{pet.birthday}，体重：{pet.weight_kg}kg"

    async def analyze_stream(self, pet_id: str, image_base64: str):
        """Stream lab report analysis. Yields text chunks."""
        pet_context = await self._get_pet_context(pet_id)
        prompt = LAB_REPORT_PROMPT.format(pet_context=pet_context)

        messages = [
            {"role": "user", "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": image_base64}},
            ]}
        ]

        async for chunk in vision_completion_stream(messages, model="glm-4.6v"):
            yield chunk
