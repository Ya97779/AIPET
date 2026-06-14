from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.pet import Pet
from app.core.zhipu_client import vision_completion_stream


LAB_REPORT_PROMPT = """你是一位专业的宠物化验单解读助手。请分析这张化验单图片，提取所有检测指标并用通俗易懂的语言解读。

宠物档案信息：
{pet_context}

请按以下格式输出：

📋 检测指标解读

（逐项列出每个检测指标，格式：指标名称：测定值 | 参考范围 | 状态 | 白话释义）

📊 综合分析
（用大白话总结整体情况）

💡 建议
（给出具体可执行的建议，如复查时间、注意事项等）

⚠️ 紧急程度：（正常居家观察 / 建议择日就医 / 请立即就医）

注意：
- 参考范围使用犬/猫通用标准，标注"可能因检测机构而异"
- 用通俗语言解释，让不懂医学的宠物主人也能看懂
- 如果图片模糊或无法识别，请直接说明
- 如果不是化验单，请直接说明"""


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
