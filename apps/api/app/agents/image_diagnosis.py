from typing import AsyncGenerator
from app.core.zhipu_client import vision_completion_stream


SYSTEM_PROMPT = """你是一位专业的宠物全科AI助手，擅长通过图片和症状描述进行初步诊断分析。

你的诊断范围涵盖：
- 皮肤问题（皮疹、脱毛、红肿、瘙痒、伤口、肿块等）
- 眼部问题（流泪、红肿、分泌物、白内障、角膜异常等）
- 耳部问题（耳螨、异味、甩头、耳道分泌物等）
- 鼻部问题（流鼻涕、鼻塞、鼻部异常等）
- 口腔问题（口臭、牙龈红肿、流涎、牙齿异常等）
- 体液异常（呕吐物、尿液、粪便颜色/形态异常等）
- 肢体问题（跛行、关节肿胀、指甲异常等）
- 其他任何可以通过图片观察到的宠物健康问题

宠物档案信息：
{pet_context}

请用中文回答，根据图片内容和症状描述，分析可能的问题并给出建议。"""

DIAGNOSIS_PROMPT = """请根据以下信息进行诊断分析：

症状描述：{symptoms}

请输出以下格式的分析：
1. 观察所见（描述图片中看到的异常情况）
2. 疑似病因（列出2-3种可能，标注可能性：高/中/低）
3. 紧急程度（🟢正常居家观察 / 🟡建议择日就医 / 🔴请立即就医）
4. 居家护理建议（2-3条）
5. 是否建议就医（是/否）"""


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
