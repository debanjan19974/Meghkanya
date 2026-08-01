from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.security import get_password_hash
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.product import Product
from app.models.supplier import Supplier
from app.models.user import User


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            db.add(
                User(
                    full_name="System Admin",
                    username="admin",
                    password_hash=get_password_hash("admin123"),
                    role="admin",
                )
            )

        supplier = db.query(Supplier).filter(Supplier.name == "Shree Saree Traders").first()
        if not supplier:
            supplier = Supplier(name="Shree Saree Traders", contact_number="9876543210")
            db.add(supplier)
            db.flush()

        sample_products = [
            {
                "barcode": "SR1001",
                "name": "Banarasi Silk Saree",
                "category": "Silk",
                "buy_price": 1500,
                "sell_price": 2500,
                "stock_quantity": 12,
            },
            {
                "barcode": "SR1002",
                "name": "Kanjivaram Wedding Saree",
                "category": "Wedding",
                "buy_price": 2200,
                "sell_price": 3400,
                "stock_quantity": 8,
            },
            {
                "barcode": "SR1003",
                "name": "Soft Cotton Daily Wear",
                "category": "Cotton",
                "buy_price": 650,
                "sell_price": 1100,
                "stock_quantity": 20,
            },
            {
                "barcode": "SR1004",
                "name": "Party Wear Georgette",
                "category": "Party Wear",
                "buy_price": 900,
                "sell_price": 1650,
                "stock_quantity": 10,
            },
            {
                "barcode": "SR1005",
                "name": "Designer Printed Saree",
                "category": "Designer",
                "buy_price": 800,
                "sell_price": 1450,
                "stock_quantity": 15,
            },
        ]

        for payload in sample_products:
            existing = db.query(Product).filter(Product.barcode == payload["barcode"]).first()
            if existing:
                continue
            db.add(Product(**payload, supplier_id=supplier.id))

        db.commit()
        print("Seed complete: admin + sample suppliers/products are ready.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
