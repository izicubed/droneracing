import logging
import re

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

KB_PATH = "/home/admin/obsidian/RotorHazard_Support"
PRODUCTS_TS_PATH = "/home/admin/droneracing/frontend/src/lib/products.ts"

_FALLBACK = (
    "Здравствуйте. Помогу с RotorHazard и NuclearHazard. "
    "Подскажите, вам нужен готовый комплект, отдельные модули или помощь с настройкой?"
)

_MAX_REPLY_LEN = 800

# Keywords that signal a price question
_PRICE_KEYWORDS = re.compile(
    r"\b(цен[ауы]?|сколько|стоимост[ьи]|стоит|стоят|почём|почем|прайс)\b",
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Product catalog loader (parses frontend/src/lib/products.ts via regex)
# ---------------------------------------------------------------------------

def _extract_str(block: str, field: str) -> str:
    m = re.search(rf'{field}:\s*["\']([^"\']+)["\']', block)
    return m.group(1) if m else ""


def _extract_num(block: str, field: str) -> int | None:
    m = re.search(rf'{field}:\s*(\d+)', block)
    return int(m.group(1)) if m else None


def load_product_catalog() -> list[dict]:
    """Parse products.ts and return list of product dicts."""
    try:
        with open(PRODUCTS_TS_PATH, encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        logger.warning("products.ts not found at %s", PRODUCTS_TS_PATH)
        return []

    # Each product object is a { ... } block that contains a 'slug:' field.
    # We split on top-level braces by scanning character by character.
    products = []
    depth = 0
    start = -1
    for i, ch in enumerate(content):
        if ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start != -1:
                block = content[start : i + 1]
                slug = _extract_str(block, "slug")
                if slug:  # only product objects have a slug field
                    name = _extract_str(block, "name")
                    category = _extract_str(block, "category")
                    price = _extract_num(block, "price")
                    old_price = _extract_num(block, "oldPrice")
                    short_desc = _extract_str(block, "shortDesc")
                    if name and price is not None:
                        products.append(
                            {
                                "slug": slug,
                                "name": name,
                                "category": category,
                                "price": price,
                                "old_price": old_price,
                                "short_desc": short_desc,
                            }
                        )
                start = -1

    return products


def format_catalog(products: list[dict]) -> str:
    """Format product list as a compact catalog string for the prompt."""
    lines = []
    for p in products:
        price_str = f"{p['price']:,}₽".replace(",", "\u202f")
        line = f"- {p['name']}: {price_str}"
        if p.get("old_price"):
            old_str = f"{p['old_price']:,}₽".replace(",", "\u202f")
            line += f" (было {old_str})"
        if p.get("short_desc"):
            line += f" — {p['short_desc']}"
        lines.append(line)
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Post-processing: strip any dollar / USD prices the model hallucinated
# ---------------------------------------------------------------------------

_DOLLAR_RE = re.compile(r"(\$\s?\d[\d\s,\.]*|\d[\d\s,\.]+\s*(USD|долл\w*))", re.IGNORECASE)


def _enforce_ruble_pricing(text: str, products: list[dict]) -> str:
    """If the reply contains dollar prices, replace with a safe ruble message."""
    if not _DOLLAR_RE.search(text):
        return text

    logger.warning("LLM returned dollar pricing — sanitising reply.")

    # Try to find the product mentioned in the text and give a proper answer
    mentioned = []
    for p in products:
        # match by slug keywords or key words from name
        keywords = [p["slug"]] + p["name"].lower().split()
        if any(kw.lower() in text.lower() for kw in keywords if len(kw) > 3):
            mentioned.append(p)

    if mentioned:
        parts = []
        for p in mentioned:
            price_str = f"{p['price']:,}₽".replace(",", "\u202f")
            parts.append(f"{p['name']} — {price_str}")
        return ". ".join(parts) + ". Уточните, если нужна дополнительная информация."

    return (
        "Цены уточните на нашем сайте droneracing.vercel.app/rotorhazard — "
        "там всегда актуальные рублёвые цены."
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _clean_reply(text: str) -> str:
    """Strip markdown artifacts and trim overly long replies."""
    text = re.sub(r"\*{1,3}(.+?)\*{1,3}", r"\1", text)
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*[-*]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*\d+\.\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = text.strip()

    if len(text) <= _MAX_REPLY_LEN:
        return text

    trimmed = text[:_MAX_REPLY_LEN]
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


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

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

    # Load live catalog from source of truth
    products = load_product_catalog()
    catalog_text = format_catalog(products) if products else "(каталог недоступен)"

    kb_content = load_kb()

    is_price_question = bool(_PRICE_KEYWORDS.search(message_text))

    price_urgency = ""
    if is_price_question:
        # Find which products the user might be asking about
        mentioned_names = [
            p["name"]
            for p in products
            if any(
                kw.lower() in message_text.lower()
                for kw in [p["slug"]] + p["name"].lower().split()
                if len(kw) > 3
            )
        ]
        if mentioned_names:
            price_urgency = (
                "\n\nКЛИЕНТ СПРАШИВАЕТ О ЦЕНЕ. Назови точную цену из каталога выше "
                f"для: {', '.join(mentioned_names)}. Только рубли (₽). Никаких $, USD, «около», «примерно»."
            )
        else:
            price_urgency = (
                "\n\nКЛИЕНТ СПРАШИВАЕТ О ЦЕНЕ. Назови точную цену из каталога выше. "
                "Только рубли (₽). Никаких $, USD, «около», «примерно»."
            )

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

АКТУАЛЬНЫЙ КАТАЛОГ ЦЕН (источник истины — наш сайт, в рублях):
{catalog_text}

ПРАВИЛА ПО ЦЕНАМ — строго обязательны:
- Называй ТОЛЬКО цены из каталога выше. Никаких других источников.
- Валюта ВСЕГДА только ₽ (рубли). Никаких $, USD, долларов.
- Не выдумывай цены и не округляй их.
- Если товара нет в каталоге — скажи, что уточнишь состав и цену.
- Можно назвать текущую цену и старую, чтобы показать скидку.{price_urgency}

КАК ТЫ ПОМОГАЕШЬ:
Помогаешь выбрать комплект, разобраться с настройкой, совместимостью, установкой, прошивкой, доставкой.
Если клиент готов к покупке — собери имя и телефон, остальное уточнишь сам.
Внутренние процессы и инструменты не раскрывай.

ДОПОЛНИТЕЛЬНАЯ БАЗА ЗНАНИЙ (FAQ, совместимость, доставка):

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
        cleaned = _clean_reply(raw)
        return _enforce_ruble_pricing(cleaned, products)

    except httpx.TimeoutException:
        logger.error("OpenRouter request timed out after 30s")
        return _FALLBACK
    except httpx.RequestError as exc:
        logger.error("OpenRouter network error: %s", exc)
        return _FALLBACK
    except Exception as exc:
        logger.error("Unexpected error calling OpenRouter: %s", exc, exc_info=True)
        return _FALLBACK
