import httpx
import json
from typing import AsyncGenerator
from app.core.config import get_settings

settings = get_settings()

ZHIPU_BASE_URL = "https://open.bigmodel.cn/api/paas/v4"


async def chat_completion_stream(
    messages: list[dict],
    model: str = None,
    temperature: float = 0.7,
) -> AsyncGenerator[str, None]:
    """Stream chat completion from Zhipu GLM API."""
    if model is None:
        model = settings.ZHIPU_TEXT_MODEL

    headers = {
        "Authorization": f"Bearer {settings.ZHIPU_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "stream": True,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            f"{ZHIPU_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                    except json.JSONDecodeError:
                        continue


async def chat_completion(
    messages: list[dict],
    model: str = None,
    temperature: float = 0.7,
) -> str:
    """Non-streaming chat completion from Zhipu GLM API."""
    if model is None:
        model = settings.ZHIPU_TEXT_MODEL

    headers = {
        "Authorization": f"Bearer {settings.ZHIPU_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "stream": False,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{ZHIPU_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def vision_completion_stream(
    messages: list[dict],
    model: str = None,
    temperature: float = 0.7,
) -> AsyncGenerator[str, None]:
    """Stream vision completion from Zhipu GLM-4.6V API."""
    if model is None:
        model = settings.ZHIPU_VISION_MODEL

    headers = {
        "Authorization": f"Bearer {settings.ZHIPU_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "stream": True,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            f"{ZHIPU_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                    except json.JSONDecodeError:
                        continue
