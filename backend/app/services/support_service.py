import logging
import re

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

KB_PATH = "/home/admin/obsidian/RotorHazard_Support"

_FALLBACK = (
    "Здравствуйте. Помогу с RotorHazard и NuclearHazard. "
    "Подскажите, вам нужен готовый комплект, отдельные модули или помощь с настройкой?"
)

_MAX_REPLY_LEN = 800


def _clean_reply(text: str) -> str:
    """Strip markdown artifacts and trim overly long replies."""
    # Remove bold/italic markers
    text = re.sub(r"\*{1,3}(.+?)\*{1,3}", r"\1", text)
    # Remove headers (### Header)
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
    # Remove leading list markers (- item, * item, 1. item)
    text = re.sub(r"^\s*[-*]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*\d+\.\s+", "", text, flags=re.MULTILINE)
    # Collapse multiple blank lines into one
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = text.strip()

    if len(text) <= _MAX_REPLY_LEN:
        return text

    # Trim to last sentence boundary within the limit
    trimmed = text[:_MAX_REPLY_LEN]
    # Try to cut at the last sentence-ending punctuation
    cut = max(trimmed.rfind(". "), trimmed.rfind("! "), trimmed.rfind("? "))
    if cut > _MAX_REPLY_LEN // 2:
        text = trimmed[: cut + 1].strip()
    else:
        text = trimmed.rstrip() + "…"

    return text


def load_kb() -> str:
    """Load knowledge base from FAQ.md, Products.md and Price_List.md."""
    parts = []
    for filename in ("FAQ.md", "Products.md", "Price_List.md"):
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

    system_prompt = f"""Ты Андрей — живой специалист поддержки по оборудованию RotorHazard и NuclearHazard. Общаешься с клиентами в чате.

ПРАВИЛА СТИЛЯ — обязательны, без исключений:
- Отвечай только по-русски.
- Коротко: 2–4 предложения в обычном ответе, максимум 5.
- Никакого markdown: никаких **, ##, *курсива*, списков с дефисами, нумерации.
- Никакого канцелярита ("в соответствии с", "на данный момент", "вышеуказанный").
- Не начинай с "Конечно!", "Отличный вопрос!", "Я понимаю".
- После ответа — максимум один уточняющий вопрос, и то только если нужен.
- Если речь о покупке: спрашивай только имя и телефон, больше ничего.
- Не перечисляй всё подряд — назови главное и дай клиенту спросить сам.
- Пиши как человек, не как бот.

ЦЕНЫ:
- Если клиент спрашивает цену — называй конкретную цену из базы знаний (Price_List.md или Products.md).
- Если цена на товар известна — называй её прямо, без расплывчатости ("около", "примерно", "зависит от").
- Не выдумывай цены. Бери только из базы знаний.
- Можно сразу назвать цену и старую цену, чтобы показать скидку.

КАК ТЫ ПОМОГАЕШЬ:
Помогаешь выбрать комплект, разобраться с настройкой, совместимостью, установкой, прошивкой, доставкой.
Если клиент готов к покупке — собери имя и телефон, остальное уточнишь сам.
Внутренние процессы и инструменты не раскрывай.

БАЗА ЗНАНИЙ:

{kb_content}"""

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
        raw = data["choices"][0]["message"]["content"]
        return _clean_reply(raw)

    except httpx.TimeoutException:
        logger.error("OpenRouter request timed out after 30s")
        return _FALLBACK
    except httpx.RequestError as exc:
        logger.error("OpenRouter network error: %s", exc)
        return _FALLBACK
    except Exception as exc:
        logger.error("Unexpected error calling OpenRouter: %s", exc, exc_info=True)
        return _FALLBACK
