"""
Lead field parser: extracts name, phone, email, telegram, product,
order_summary, notes from free-form customer messages using regex + heuristics.
No external dependencies — stdlib re only.
"""

import re
import logging
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# ── Product keyword map ────────────────────────────────────────────────────────

PRODUCT_KEYWORDS: dict[str, list[str]] = {
    "RotorHazard": ["rotorhazard", "ротор хазард", "rh "],
    "NuclearHazard": ["nuclearhazard", "nuclear hazard", "нуклеар"],
    "turnkey": ["под ключ", "turnkey"],
    "RX5808": ["rx5808", "rx 5808"],
    "Raspberry Pi": ["raspberry", "малина", "raspberry pi"],
    "kit": ["комплект", " kit", "кит "],
    "PCB": ["плата", " pcb", "печатная"],
    "корпус": ["корпус"],
    "atom": ["атом", " atom"],
    "full": ["полный комплект", "full set", "full kit"],
}

# ── Order summary keywords ────────────────────────────────────────────────────

# Phrases that signal the customer is describing what they want to order
_ORDER_SIGNALS = [
    "нужен", "нужна", "нужно", "хочу", "хотел", "хотела",
    "интересует", "купить", "заказать", "заказ", "приобрести",
    "комплект", "пилотов", "гонок", "трасс", "для соревнований",
    "стартовый", "full set", "full kit",
]

# ── Phone ──────────────────────────────────────────────────────────────────────

# Matches Russian/KZ mobile numbers: +7 or 8, then 10 digits with optional separators
_PHONE_RE = re.compile(
    r"(?:\+7|8)"          # country code
    r"[\s\-]?"            # optional separator
    r"\(?"                # optional (
    r"\d{3}"              # area code (3 digits)
    r"\)?"                # optional )
    r"[\s\-]?"            # optional separator
    r"\d{3}"              # first 3 digits
    r"[\s\-]?"            # optional separator
    r"\d{2}"              # next 2 digits
    r"[\s\-]?"            # optional separator
    r"\d{2}"              # last 2 digits
)

# ── Email ──────────────────────────────────────────────────────────────────────

_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

# ── Telegram username ──────────────────────────────────────────────────────────

# Matches @username (Telegram rules: 5-32 chars, letters/digits/underscores)
_TELEGRAM_RE = re.compile(r"@([a-zA-Z0-9_]{5,32})\b")

# ── Name ───────────────────────────────────────────────────────────────────────

# Explicit introduction patterns (Russian + English)
_NAME_PATTERNS = [
    re.compile(r"(?:меня\s+зовут|зовут\s+меня)\s+([А-ЯЁA-Z][А-ЯЁа-яёA-Za-z\-]{1,30}(?:\s+[А-ЯЁA-Z][А-ЯЁа-яёA-Za-z\-]{1,30}){0,2})", re.IGNORECASE),
    re.compile(r"(?:имя\s*[:\-]?\s*)([А-ЯЁA-Z][А-ЯЁа-яёA-Za-z\-]{1,30}(?:\s+[А-ЯЁA-Z][А-ЯЁа-яёA-Za-z\-]{1,30}){0,2})", re.IGNORECASE),
    re.compile(r"(?:my\s+name\s+is|this\s+is|i'?m)\s+([A-Z][A-Za-z\-]{1,30}(?:\s+[A-Z][A-Za-z\-]{1,30}){0,2})", re.IGNORECASE),
    re.compile(r"(?:^|[\s,.!?:;])я\s+([А-ЯЁ][А-ЯЁа-яё\-]{1,30}(?:\s+[А-ЯЁ][А-ЯЁа-яё\-]{1,30}){0,2})", re.IGNORECASE),
]

# Fallback: sequence of 1-3 Cyrillic words starting with uppercase
_NAME_CYRILLIC_RE = re.compile(
    r"\b([А-ЯЁ][а-яё]{1,20}(?:\s+[А-ЯЁ][а-яё]{1,20}){0,2})\b"
)

# Words to skip as false-positive name candidates
_NAME_STOPWORDS = frozenset([
    "RotorHazard", "NuclearHazard", "Raspberry", "Привет", "Здравствуйте",
    "Добрый", "Спасибо", "Пожалуйста", "Хотел", "Хочу", "Нужен", "Нужна",
    "Можно", "Скажите", "Подскажите", "Интересует", "Купить", "Заказать",
    "Есть", "Буду", "Хотела", "Занимаюсь", "Делаю",
])


# ── Main parser ────────────────────────────────────────────────────────────────

@dataclass
class ParsedLead:
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    telegram: str | None = None
    product: str | None = None
    order_summary: str | None = None
    notes: str | None = None


def parse_lead_fields(text: str) -> ParsedLead:
    """
    Extract lead fields from a free-form customer message.
    Returns a ParsedLead dataclass with None for undetected fields.
    """
    result = ParsedLead(notes=text)

    # ── Email ──────────────────────────────────────────────────────────────────
    email_m = _EMAIL_RE.search(text)
    if email_m:
        result.email = email_m.group(0).lower()
        logger.debug("lead_parser: email=%s", result.email)

    # ── Phone ──────────────────────────────────────────────────────────────────
    phone_m = _PHONE_RE.search(text)
    if phone_m:
        raw = phone_m.group(0)
        digits = re.sub(r"[\s\-()]", "", raw)
        # Normalize to +7... format
        if digits.startswith("8") and len(digits) == 11:
            digits = "+7" + digits[1:]
        result.phone = digits
        logger.debug("lead_parser: phone=%s", result.phone)

    # ── Telegram username ──────────────────────────────────────────────────────
    tg_m = _TELEGRAM_RE.search(text)
    if tg_m:
        result.telegram = "@" + tg_m.group(1)
        logger.debug("lead_parser: telegram=%s", result.telegram)

    # ── Product ────────────────────────────────────────────────────────────────
    text_lower = text.lower()
    for product_name, keywords in PRODUCT_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            result.product = product_name
            logger.debug("lead_parser: product=%s", result.product)
            break

    # ── Order summary ──────────────────────────────────────────────────────────
    # If message contains order signals, use the whole message as order_summary
    if any(sig in text_lower for sig in _ORDER_SIGNALS):
        # Trim to 500 chars to keep it concise
        result.order_summary = text[:500].strip()
        logger.debug("lead_parser: order_summary captured (%d chars)", len(result.order_summary))

    # ── Name: explicit introduction first ─────────────────────────────────────
    for pattern in _NAME_PATTERNS:
        intro_m = pattern.search(text)
        if not intro_m:
            continue
        candidate = intro_m.group(1).strip(" ,.!?:;-")
        if candidate and candidate not in _NAME_STOPWORDS:
            result.name = candidate
            logger.debug("lead_parser: name (intro)=%s", result.name)
            break

    # ── Name: Cyrillic capitalized fallback ────────────────────────────────────
    if not result.name:
        for m in _NAME_CYRILLIC_RE.finditer(text):
            candidate = m.group(1).strip()
            # Skip stopwords and very short tokens
            if candidate in _NAME_STOPWORDS or len(candidate) < 3:
                continue
            # Skip if it looks like a sentence start (preceded by . or start of text)
            start = m.start()
            pre = text[:start].rstrip()
            if pre and pre[-1] not in ".!?\n":
                continue
            result.name = candidate
            logger.debug("lead_parser: name (fallback)=%s", result.name)
            break

    return result


# ── Merge helper ───────────────────────────────────────────────────────────────

def merge_lead_fields(lead, parsed: ParsedLead) -> bool:
    """
    Merge parsed fields into an existing Lead ORM object.
    Only fills empty fields — never overwrites existing data.
    Returns True if any field was updated.
    """
    updated = False
    if parsed.name and not lead.name:
        lead.name = parsed.name
        updated = True
    if parsed.phone and not lead.phone:
        lead.phone = parsed.phone
        updated = True
    if parsed.email and not lead.email:
        lead.email = parsed.email
        updated = True
    if parsed.telegram and not lead.telegram:
        lead.telegram = parsed.telegram
        updated = True
    if parsed.product and not lead.product:
        lead.product = parsed.product
        updated = True
    if parsed.order_summary and not lead.order_summary:
        lead.order_summary = parsed.order_summary
        updated = True
    if parsed.notes and not lead.notes:
        lead.notes = parsed.notes
        updated = True
    return updated
