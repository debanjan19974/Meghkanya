from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.security import get_password_hash
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models import User  # noqa: F401
from app.models import product, purchase, sale, stock_ledger, supplier  # noqa: F401

app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router)


def _ensure_sales_schema() -> None:
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    if "sales" in existing_tables:
        sales_columns = [column["name"] for column in inspector.get_columns("sales")]
        with engine.connect() as connection:
            if "customer_name" not in sales_columns:
                connection.execute(
                    text("ALTER TABLE sales ADD COLUMN customer_name VARCHAR(120) DEFAULT ''")
                )
            if "customer_phone" not in sales_columns:
                connection.execute(
                    text("ALTER TABLE sales ADD COLUMN customer_phone VARCHAR(40) DEFAULT ''")
                )
            if "shipping_address" not in sales_columns:
                connection.execute(
                    text("ALTER TABLE sales ADD COLUMN shipping_address VARCHAR(500) DEFAULT ''")
                )
    if "sale_items" in existing_tables:
        sale_item_columns = [column["name"] for column in inspector.get_columns("sale_items")]
        with engine.connect() as connection:
            if "shipment_barcode" not in sale_item_columns:
                connection.execute(
                    text("ALTER TABLE sale_items ADD COLUMN shipment_barcode VARCHAR(120) DEFAULT ''")
                )


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_sales_schema()
    if not settings.bootstrap_admin_enabled:
        return

    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == settings.bootstrap_admin_username).first()
        if not admin:
            db.add(
                User(
                    full_name=settings.bootstrap_admin_full_name,
                    username=settings.bootstrap_admin_username,
                    password_hash=get_password_hash(settings.bootstrap_admin_password),
                    role="admin",
                )
            )
            db.commit()
    finally:
        db.close()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
