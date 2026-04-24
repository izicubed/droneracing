import asyncio
import secrets
import string
import sys
from pathlib import Path

from sqlalchemy import select

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.database import AsyncSessionLocal
from app.models.user import User, UserRole
from app.services.auth import hash_password

VLAD_EMAIL = "vlad_9508@inbox.ru"
IZI_EMAIL = "izicubed@gmail.com"
ALPHABET = string.ascii_letters + string.digits + "!@#$%"


def gen_password(length: int = 16) -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(length))


async def main():
    password = gen_password()
    async with AsyncSessionLocal() as db:
        izi = (await db.execute(select(User).where(User.email == IZI_EMAIL))).scalar_one_or_none()
        if izi and izi.role not in (UserRole.superadmin, UserRole.admin):
            izi.role = UserRole.admin

        vlad = (await db.execute(select(User).where(User.email == VLAD_EMAIL))).scalar_one_or_none()
        if vlad is None:
            vlad = User(email=VLAD_EMAIL, password_hash=hash_password(password), role=UserRole.admin)
            db.add(vlad)
            created = True
        else:
            vlad.role = UserRole.admin
            created = False

        await db.commit()
        print({"email": VLAD_EMAIL, "password": password if created else None, "created": created, "izi_role": izi.role.value if izi else None})


if __name__ == "__main__":
    asyncio.run(main())
