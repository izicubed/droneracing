import logging
import re

import httpx

from app.config import settings
from app.services.product_catalog import CATALOG

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
# Deterministic FAQ: RotorHazard vs NuclearHazard
# ---------------------------------------------------------------------------

_RH_VS_NH_RE = re.compile(
    r"(rotorh\w*.*nuclearhaz|nuclearhaz\w*.*rotorh|"
    r"роторхаз\w*.*ньюклир|ньюклир\w*.*роторхаз|"
    r"(чем|в\s+чём?|в\s+чем|разниц[аеу]|отличи[еяй]|отличается|разли[чч]|difference)\b.{0,60}"
    r"(rotorhazard|nuclearhazard|роторхаз|ньюклир)|"
    r"(rotorhazard|nuclearhazard|роторхаз|ньюклир).{0,60}"
    r"(чем|в\s+чём?|в\s+чем|разниц[аеу]|отличи[еяй]|отличается|разли[чч]|difference))",
    re.IGNORECASE,
)

_RH_VS_NH_ANSWER = (
    "По сути это одна и та же система засечки. Главное отличие не в самой логике работы, а в плате.\n\n"
    "RotorHazard — вариант для тех, кто готов собирать сам. "
    "Можно купить просто печатную плату или комплект для сборки. Это самый дешёвый вариант.\n\n"
    "NuclearHazard — это уже предсобранная плата. "
    "Её не нужно паять, достаточно подключить Raspberry Pi и приёмники.\n\n"
    "Если коротко: RotorHazard дешевле, если готов собирать сам. "
    "NuclearHazard удобнее, если хочешь готовое решение без пайки. "
    "На каждый канал нужен отдельный приёмник — их количество определяет, сколько пилотов летит одновременно."
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
        logger.warning("products.ts not found at %s, using embedded catalog", PRODUCTS_TS_PATH)
        return CATALOG

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

    return products or CATALOG


def _format_rub(price: int) -> str:
    return f"{price:,}₽".replace(",", "\u202f")


def format_catalog(products: list[dict]) -> str:
    """Format product list as a compact catalog string for the prompt."""
    lines = []
    for p in products:
        price_str = _format_rub(p['price'])
        line = f"- {p['name']}: {price_str}"
        if p.get("old_price"):
            old_str = _format_rub(p['old_price'])
            line += f" (было {old_str})"
        if p.get("short_desc"):
            line += f" — {p['short_desc']}"
        lines.append(line)
    return "\n".join(lines)


def _product_keywords(product: dict) -> list[str]:
    name_words = re.findall(r"[A-Za-zА-Яа-яЁё0-9]+", product["name"].lower())
    extra = [product["slug"].lower(), product.get("category", "").lower()]
    return [kw for kw in (name_words + extra) if len(kw) > 2]


def _find_products_in_text(message_text: str, products: list[dict]) -> list[dict]:
    text = message_text.lower()
    matches: list[dict] = []
    for product in products:
        keywords = _product_keywords(product)
        if any(keyword in text for keyword in keywords):
            matches.append(product)
    unique = []
    seen = set()
    for product in matches:
        if product["slug"] not in seen:
            seen.add(product["slug"])
            unique.append(product)
    return unique


def _build_price_reply(message_text: str, products: list[dict]) -> str | None:
    if not _PRICE_KEYWORDS.search(message_text):
        return None
    matched = _find_products_in_text(message_text, products)
    if not matched:
        return None
    parts = [f"{product['name']} — {_format_rub(product['price'])}" for product in matched[:3]]
    reply = ". ".join(parts) + "."
    if len(matched) == 1:
        reply += " Если хотите, подскажу, что ещё нужно к этому комплекту."
    else:
        reply += " Если хотите, могу сразу подсказать, что лучше взять под ваш сценарий."
    return reply


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

    # Deterministic FAQ: answer before touching LLM
    if _RH_VS_NH_RE.search(message_text):
        logger.info("Deterministic FAQ match: RH vs NH question — returning hardcoded answer")
        return _RH_VS_NH_ANSWER

    direct_price_reply = _build_price_reply(message_text, products)
    if direct_price_reply:
        return direct_price_reply

    kb_content = load_kb()

    is_price_question = bool(_PRICE_KEYWORDS.search(message_text))

    price_urgency = ""
    if is_price_question:
        # Find which products the user might be asking about
        mentioned_names = [p["name"] for p in _find_products_in_text(message_text, products)]
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
- Говори проще: как живой человек в чате, не как менеджер или бот.
- Никаких умных слов, канцелярита, маркетинговых фраз от себя.
- Коротко: 2–4 предложения в обычном ответе, максимум 5.
- Никакого markdown: никаких **, ##, *курсива*, списков с дефисами, нумерации.
- Не начинай с "Конечно!", "Отличный вопрос!", "Я понимаю".
- После ответа — максимум один уточняющий вопрос, и то только если нужен.
- Если речь о покупке: спрашивай только имя и телефон, больше ничего.
- Не перечисляй всё подряд — назови главное и дай клиенту спросить сам.

АКТУАЛЬНЫЙ КАТАЛОГ ЦЕН (источник истины — наш сайт, в рублях):
{catalog_text}

ПРАВИЛА ПО ЦЕНАМ — строго обязательны:
- Называй ТОЛЬКО цены из каталога выше. Никаких других источников.
- Валюта ВСЕГДА только ₽ (рубли). Никаких $, USD, долларов.
- Не выдумывай цены и не округляй их.
- Если товара нет в каталоге — скажи, что уточнишь состав и цену.
- Можно назвать текущую цену и старую, чтобы показать скидку.{price_urgency}

ПРАВИЛА ПО ФАКТАМ — строго обязательны:
- Отвечай строго по фактам из KB и каталога. Никакой отсебятины.
- Не выдумывай характеристики, отличия или позиционирование продуктов.
- Если факт не подтверждён базой знаний или каталогом — не утверждай его. Скажи, что уточнишь.
- Если не уверен — так и скажи: "уточню" или "не знаю точно, уточню у команды".

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
