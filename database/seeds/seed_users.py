"""
BIOS Default User Seed
========================
Creates the four default enterprise role accounts with the
standard password Admin@123.

Usage:
    python database/seeds/seed_users.py
"""
import asyncio
import sys
import os

# Resolve project root
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, ROOT)

from backend.shared.security import get_password_hash

DEFAULT_USERS = [
    {
        "email": "superadmin@bios.com",
        "password": "Admin@123",
        "full_name": "Super Admin",
        "role": "super_admin"
    },
    {
        "email": "admin@bios.com",
        "password": "Admin@123",
        "full_name": "Enterprise Admin",
        "role": "admin"
    },
    {
        "email": "analyst@bios.com",
        "password": "Admin@123",
        "full_name": "Lead Analyst",
        "role": "analyst"
    },
    {
        "email": "viewer@bios.com",
        "password": "Admin@123",
        "full_name": "External Viewer",
        "role": "viewer"
    }
]


async def seed():
    import aiosqlite
    import uuid
    db_path = os.path.join(ROOT, "database", "bios_db.db")
    if not os.path.exists(db_path):
        db_path = os.path.join(ROOT, "bios_db.db")

    async with aiosqlite.connect(db_path) as db:
        for u in DEFAULT_USERS:
            hashed = get_password_hash(u["password"])
            uid = str(uuid.uuid4())
            await db.execute("DELETE FROM users WHERE email = ?", (u["email"],))
            await db.execute(
                """
                INSERT INTO users (id, email, hashed_password, full_name, role, is_mfa_enabled)
                VALUES (?, ?, ?, ?, ?, 0)
                """,
                (uid, u["email"], hashed, u["full_name"], u["role"])
            )
        await db.commit()
        print("SUCCESS: Default users seeded with password: Admin@123")


if __name__ == "__main__":
    asyncio.run(seed())
