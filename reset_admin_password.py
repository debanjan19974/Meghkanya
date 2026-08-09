import os

from dotenv import load_dotenv

# Load D:\Meghkanya\.env
load_dotenv()

from app.db.session import SessionLocal
from app.core.security import pwd_context
from app.models.user import User


ADMIN_USERNAME = os.getenv(
    "BOOTSTRAP_ADMIN_USERNAME",
    "admin"
)

ADMIN_PASSWORD = os.getenv(
    "BOOTSTRAP_ADMIN_PASSWORD"
)


if not ADMIN_PASSWORD:
    raise RuntimeError(
        "BOOTSTRAP_ADMIN_PASSWORD was not found in the .env file."
    )


db = SessionLocal()

try:
    admin = (
        db.query(User)
        .filter(User.username == ADMIN_USERNAME)
        .first()
    )

    if admin is None:
        raise RuntimeError(
            f"User '{ADMIN_USERNAME}' was not found in PostgreSQL."
        )

    admin.password_hash = pwd_context.hash(
        ADMIN_PASSWORD
    )

    db.commit()

    print()
    print("=" * 60)
    print("ADMIN PASSWORD RESET SUCCESSFUL")
    print("=" * 60)
    print()
    print("Username:", admin.username)
    print("Role:", admin.role)
    print("Active:", admin.is_active)
    print()
    print("Password was read from .env.")
    print("The password itself was NOT displayed.")
    print()

except Exception:
    db.rollback()
    raise

finally:
    db.close()