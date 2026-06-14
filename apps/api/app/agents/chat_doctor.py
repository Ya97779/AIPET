from typing import AsyncGenerator
from app.core.zhipu_client import chat_completion_stream


SYSTEM_PROMPT = """你是一位经验丰富的宠物AI医生。请通过多轮问诊，帮助主人分析宠物的健康问题。

宠物档案信息：
{pet_context}

问诊流程：
1. 了解主诉症状
2. 追问关键信息（持续时间、伴随症状、饮食变化等）
3. 2-4轮后给出诊断建议

请用中文回答。在追问阶段，用自然语言提问。在诊断阶段，请输出以下格式：
1. 疑似病因（列出2-3种可能，标注可能性：高/中/低）
2. 紧急程度（🟢正常居家观察 / 🟡建议择日就医 / 🔴请立即就医）
3. 居家护理建议（2-3条）
4. 是否建议就医（是/否）"""


async def chat_diagnosis_stream(
    messages: list[dict],
    pet_context: str,
) -> AsyncGenerator[str, None]:
    """Stream chat diagnosis from GLM-4.7."""
    full_messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT.format(pet_context=pet_context),
        },
        *messages,
    ]

    async for chunk in chat_completion_stream(full_messages):
        yield chunk
