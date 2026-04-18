import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

KB_PATH = "/home/admin/obsidian/RotorHazard_Support"

_FALLBACK = (
    "Здравствуйте! Помогу с RotorHazard и NuclearHazard. "
    "Подскажите, вас интересует подбор комплекта, настройка системы или решение конкретной проблемы?"
)


def load_kb() -> str:
    """Load knowledge base from FAQ.md and Products.md."""
    parts = []
    for filename in ("FAQ.md", "Products.md"):
        try:
            with open(f"{KB_PATH}/{filename}", encoding="utf-8") as f:
                parts.append(f"### {filename}\n\n{f.read()}")
        except FileNotFoundError:
            logger.debug("KB file not found: %s/%s", KB_PATH, filename)
    return "\n\n---\n\n".join(parts)


async def process_support_message(message_text: str) -> str:
    """
    Process client message via LLM through OpenRouter.
    Returns Andrey's response, or a fallback string on any failure.
    """
    if not settings.openrouter_api_key:
        logger.warning(
            "OPENROUTER_API_KEY is not set — returning fallback response. "
            "Set it via the OPENROUTER_API_KEY environment variable."
        )
        return _FALLBACK

    kb_content = load_kb()

    system_prompt = f"""Ты Андрей, специалист по поддержке и консультант по оборудованию RotorHazard и NuclearHazard.

## База знаний (продукты и FAQ):

{kb_content}

## Как ты работаешь:
- Общаешься только по-русски, вежливо и по делу
- Помогаешь подобрать комплект, разобраться с настройкой и совместимостью оборудования
- Отвечаешь на вопросы по установке, прошивке, доставке
- Не раскрываешь внутреннюю кухню, инструменты и процессы компании
- Если клиент готов к покупке или хочет уточнить детали — аккуратно предложи оформить заявку
- Для оформления заявки собери: имя, номер телефона, что интересует, любые уточнения
- Email не запрашивай первым — телефона достаточно
- Отвечай кратко и по делу, используй эмодзи умеренно"""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.openrouter_api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://droneracing.vercel.app",
                    "X-Title": "RotorHazard Support",
                },
                json={
                    "model": "gpt-5.4",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": message_text},
                    ],
                    "max_tokens": 512,
                },
            )

        if resp.status_code != 200:
            snippet = resp.text[:300]
            logger.error(
                "OpenRouter returned HTTP %d. Response: %s",
                resp.status_code,
                snippet,
            )
            return _FALLBACK

        data = resp.json()
        return data["choices"][0]["message"]["content"]

    except httpx.TimeoutException:
        logger.error("OpenRouter request timed out after 30s")
        return _FALLBACK
    except httpx.RequestError as exc:
        logger.error("OpenRouter network error: %s", exc)
        return _FALLBACK
    except Exception as exc:
        logger.error("Unexpected error calling OpenRouter: %s", exc, exc_info=True)
        return _FALLBACK
