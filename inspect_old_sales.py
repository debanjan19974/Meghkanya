import sqlite3

db = sqlite3.connect("saree_retail.db")
db.row_factory = sqlite3.Row

for table in ["sales", "sale_items"]:
    print()
    print("=" * 70)
    print(f"{table} COLUMNS")
    print("=" * 70)

    columns = db.execute(f"PRAGMA table_info({table})").fetchall()

    for column in columns:
        print(
            f"{column['name']:25} "
            f"type={column['type']:15} "
            f"not_null={column['notnull']} "
            f"default={column['dflt_value']}"
        )

    print()
    print(f"{table} SAMPLE DATA")

    rows = db.execute(
        f"SELECT * FROM {table} ORDER BY id LIMIT 3"
    ).fetchall()

    for row in rows:
        print(dict(row))

db.close()