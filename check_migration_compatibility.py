import sqlite3
from sqlalchemy import inspect

from app.db.session import engine

SQLITE_DB = "saree_retail.db"

TABLES = [
    "users",
    "suppliers",
    "products",
    "purchases",
    "purchase_items",
    "sales",
    "sale_items",
    "stock_ledger",
]


def sqlite_columns():
    db = sqlite3.connect(SQLITE_DB)

    result = {}

    for table in TABLES:
        rows = db.execute(f"PRAGMA table_info({table})").fetchall()
        result[table] = [row[1] for row in rows]

    db.close()
    return result


def postgres_columns():
    inspector = inspect(engine)

    result = {}

    for table in TABLES:
        result[table] = [
            column["name"]
            for column in inspector.get_columns(table)
        ]

    return result


def sqlite_counts():
    db = sqlite3.connect(SQLITE_DB)

    result = {}

    for table in TABLES:
        result[table] = db.execute(
            f"SELECT COUNT(*) FROM {table}"
        ).fetchone()[0]

    db.close()
    return result


def postgres_counts():
    with engine.connect() as connection:
        result = {}

        for table in TABLES:
            result[table] = connection.exec_driver_sql(
                f'SELECT COUNT(*) FROM "{table}"'
            ).scalar()

    return result


source_columns = sqlite_columns()
target_columns = postgres_columns()

source_counts = sqlite_counts()
target_counts = postgres_counts()

print()
print("=" * 70)
print("MEGHKANYA SQLITE → POSTGRESQL COMPATIBILITY CHECK")
print("=" * 70)

print()
print("ROW COUNTS")
print("-" * 70)

for table in TABLES:
    print(
        f"{table:16} "
        f"SQLite={source_counts[table]:4} "
        f"PostgreSQL={target_counts[table]:4}"
    )

print()
print("COLUMN COMPATIBILITY")
print("-" * 70)

all_ok = True

for table in TABLES:
    source = set(source_columns[table])
    target = set(target_columns[table])

    missing_in_target = sorted(source - target)
    missing_in_source = sorted(target - source)

    print()
    print(f"[{table}]")

    if missing_in_target:
        print("  ERROR - SQLite columns missing in PostgreSQL:")
        for column in missing_in_target:
            print(f"    - {column}")
        all_ok = False

    if missing_in_source:
        print("  INFO - PostgreSQL-only columns:")
        for column in missing_in_source:
            print(f"    - {column}")

    if not missing_in_target:
        print("  Source columns are available in PostgreSQL.")

print()
print("=" * 70)

if all_ok:
    print("RESULT: COMPATIBILITY CHECK PASSED")
    print("No SQLite columns are missing from PostgreSQL.")
else:
    print("RESULT: COMPATIBILITY CHECK FAILED")
    print("DO NOT RUN THE DATA MIGRATION YET.")

print("=" * 70)