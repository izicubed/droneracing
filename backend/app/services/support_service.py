import httpx
from app.config import settings

KB_PATH = "/home/admin/obsidian/RotorHazard_Support"


def load_kb() -> str:
    """Load knowledge base from FAQ.md and Products.md."""
    parts = []
    for filename in ("FAQ.md", "Products.md"):
        try:
            with open(f"{KB_PATH}/{filename}", encoding="utf-8") as f:
                parts.append(f"### {filename}\n\n{f.read()}")
        except FileNotFoundError:
            pass
    return "\n\n---\n\n".join(parts)


async def process_support_message(message_text: str) -> str:
    """
    Process client message via Claude through OpenRouter.
    Returns Andrey's response.
    """
    kb_content = load_kb()

    system_prompt = f"""Ты Андрей Мещеряков, техническая поддержка RotorHazard и NuclearHazard.

## Информация о продуктах и частые вопросы:

{kb_content}

## Инструкции:
- Помогай клиентам выбрать оборудование
- Отвечай на вопросы о сборке, настройке, доставке
- Если клиент хочет купить или уточнить детали — собери информацию (имя, телефон, email)
- Если вопрос вне сферы — предложи связаться с Кольей (@cubedny)
- Будь вежлив, профессионален, кратко
- Используй эмодзи когда уместно (только русский текст + эмодзи)"""

    if not settings.openrouter_api_key:
        return "Привет! 👋 Я Андрей. Чем могу помочь с RotorHazard?"

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
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]
