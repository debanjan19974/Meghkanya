from sqlalchemy import text

from app.db.session import engine


with engine.connect() as connection:

    print()
    print("=" * 70)
    print("POSTGRESQL BUSINESS DATA VERIFICATION")
    print("=" * 70)

    # ---------------------------------------------------------
    # PRODUCTS
    # ---------------------------------------------------------

    print()
    print("--- PRODUCTS ---")

    products = connection.execute(
        text(
            """
            SELECT
                id,
                barcode,
                name,
                stock_quantity,
                is_active
            FROM products
            ORDER BY id
            """
        )
    ).fetchall()

    for row in products:
        print(row)

    # ---------------------------------------------------------
    # SALES
    # ---------------------------------------------------------

    print()
    print("--- SALES ---")

    sales = connection.execute(
        text(
            """
            SELECT
                id,
                invoice_no,
                total_amount
            FROM sales
            ORDER BY id
            """
        )
    ).fetchall()

    for row in sales:
        print(row)

    # ---------------------------------------------------------
    # SALE ITEMS
    # ---------------------------------------------------------

    print()
    print("--- SALE ITEMS ---")

    sale_items = connection.execute(
        text(
            """
            SELECT
                id,
                sale_id,
                product_id,
                quantity,
                shipment_barcode
            FROM sale_items
            ORDER BY id
            """
        )
    ).fetchall()

    for row in sale_items:
        print(row)

    # ---------------------------------------------------------
    # STOCK LEDGER
    # ---------------------------------------------------------

    print()
    print("--- STOCK LEDGER ---")

    stock = connection.execute(
        text(
            """
            SELECT
                id,
                product_id,
                quantity_change,
                movement_type,
                reference_type,
                reference_id
            FROM stock_ledger
            ORDER BY id
            """
        )
    ).fetchall()

    for row in stock:
        print(row)

    # ---------------------------------------------------------
    # FOREIGN KEY INTEGRITY
    # ---------------------------------------------------------

    print()
    print("--- RELATIONSHIP CHECKS ---")

    orphan_sale_items = connection.execute(
        text(
            """
            SELECT COUNT(*)
            FROM sale_items si
            LEFT JOIN products p
                ON p.id = si.product_id
            WHERE p.id IS NULL
            """
        )
    ).scalar()

    orphan_stock = connection.execute(
        text(
            """
            SELECT COUNT(*)
            FROM stock_ledger sl
            LEFT JOIN products p
                ON p.id = sl.product_id
            WHERE p.id IS NULL
            """
        )
    ).scalar()

    orphan_sale_item_sales = connection.execute(
        text(
            """
            SELECT COUNT(*)
            FROM sale_items si
            LEFT JOIN sales s
                ON s.id = si.sale_id
            WHERE s.id IS NULL
            """
        )
    ).scalar()

    print(
        "Orphan sale_items -> products:",
        orphan_sale_items,
    )

    print(
        "Orphan stock_ledger -> products:",
        orphan_stock,
    )

    print(
        "Orphan sale_items -> sales:",
        orphan_sale_item_sales,
    )

    print()
    print("=" * 70)

    if (
        orphan_sale_items == 0
        and orphan_stock == 0
        and orphan_sale_item_sales == 0
    ):
        print("RESULT: DATA RELATIONSHIPS ARE VALID")
    else:
        print("RESULT: RELATIONSHIP PROBLEM FOUND")

    print("=" * 70)