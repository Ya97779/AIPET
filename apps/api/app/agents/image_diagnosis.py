from typing import AsyncGenerator
from app.core.zhipu_client import vision_completion_stream


SYSTEM_PROMPT = """你是一位专业的宠物皮肤科AI助手。请根据用户上传的图片和描述，分析宠物的皮肤状况。

宠物档案信息：
{pet_context}

请用中文回答，分析图片中的症状，给出可能的病因和建议。"""

DIAGNOSIS_PROMPT = """请根据以下信息进行诊断分析：

症状描述：{symptoms}

请输出以下格式的分析：
1. 疑似病因（列出2-3种可能，标注可能性：高/中/低）
2. 紧急程度（🟢正常居家观察 / 🟡建议择日就医 / 🔴请立即就医）
3. 居家护理建议（2-3条）
4. 是否建议就医（是/否）"""


async def diagnose_image_stream(
    image_urls: list[str],
    symptoms: str,
    pet_context: str,
) -> AsyncGenerator[str, None]:
    """Stream image diagnosis from GLM-4.6V."""
    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT.format(pet_context=pet_context),
        },
        {
            "role": "user",
            "content": [
                {"type": "text", "text": DIAGNOSIS_PROMPT.format(symptoms=symptoms)},
                *[{"type": "image_url", "image_url": {"url": url}} for url in image_urls],
            ],
        },
    ]

    async for chunk in vision_completion_stream(messages):
        yield chunk
