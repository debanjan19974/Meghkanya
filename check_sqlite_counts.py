import sqlite3

db = sqlite3.connect("saree_retail.db")

tables = [
    "users",
    "suppliers",
    "products",
    "purchases",
    "purchase_items",
    "sales",
    "sale_items",
    "stock_ledger",
]

print("SQLite database row counts")
print("=" * 35)

for table in tables:
    count = db.execute(
        f"SELECT COUNT(*) FROM {table}"
    ).fetchone()[0]

    print(f"{table}: {count}")

db.close()