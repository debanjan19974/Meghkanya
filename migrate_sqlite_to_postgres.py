import sqlite3

from sqlalchemy import text

from app.db.session import engine


# ============================================================
# CONFIGURATION
# ============================================================

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

# Delete child/dependent tables first.
DELETE_ORDER = [
    "stock_ledger",
    "sale_items",
    "sales",
    "purchase_items",
    "purchases",
    "products",
    "suppliers",
    "users",
]


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def quote_identifier(name):
    """
    Safely quote a PostgreSQL identifier such as a table
    or column name.
    """
    return '"' + name.replace('"', '""') + '"'


def get_sqlite_columns(db, table):
    """
    Get column names from the SQLite table.
    """
    rows = db.execute(
        f'PRAGMA table_info("{table}")'
    ).fetchall()

    return [row[1] for row in rows]


def get_sqlite_rows(db, table):
    """
    Read all rows from a SQLite table.
    """
    columns = get_sqlite_columns(db, table)

    rows = db.execute(
        f'SELECT * FROM "{table}"'
    ).fetchall()

    return columns, rows


# ============================================================
# MAIN MIGRATION
# ============================================================

def migrate():

    print()
    print("=" * 70)
    print("MEGHKANYA SQLITE -> POSTGRESQL MIGRATION")
    print("=" * 70)

    # --------------------------------------------------------
    # STEP 1
    # Open SQLite in READ-ONLY mode
    # --------------------------------------------------------

    sqlite_db = sqlite3.connect(
        f"file:{SQLITE_DB}?mode=ro",
        uri=True,
    )

    sqlite_db.row_factory = sqlite3.Row

    print()
    print("SQLite source opened in READ-ONLY mode.")

    # --------------------------------------------------------
    # STEP 2
    # Read all SQLite data BEFORE touching PostgreSQL
    # --------------------------------------------------------

    source_data = {}

    for table in TABLES:

        columns, rows = get_sqlite_rows(
            sqlite_db,
            table,
        )

        source_data[table] = {
            "columns": columns,
            "rows": rows,
        }

        print(
            f"Read {table:16} "
            f"{len(rows):4} rows"
        )

    # Close SQLite immediately.
    # Nothing has been changed in SQLite.
    sqlite_db.close()

    print()
    print("SQLite source closed.")
    print("SQLite database has NOT been modified.")

    # --------------------------------------------------------
    # STEP 3
    # Start PostgreSQL transaction
    # --------------------------------------------------------

    print()
    print("Starting PostgreSQL transaction...")

    try:

        with engine.begin() as connection:

            # ------------------------------------------------
            # STEP 4
            # Clear current PostgreSQL test data
            # ------------------------------------------------

            print()
            print("Clearing current PostgreSQL test data...")

            for table in DELETE_ORDER:

                connection.execute(
                    text(
                        f'TRUNCATE TABLE '
                        f'"{table}" '
                        f'RESTART IDENTITY CASCADE'
                    )
                )

            print("PostgreSQL test data cleared.")

            # ------------------------------------------------
            # STEP 5
            # Import SQLite data
            # ------------------------------------------------

            print()
            print("Importing data...")
            print("-" * 70)

            for table in TABLES:

                columns = source_data[table]["columns"]
                rows = source_data[table]["rows"]

                # Nothing to import.
                if not rows:

                    print(
                        f"{table:16} "
                        f"0 rows - nothing to import"
                    )

                    continue

                # Build column list.
                column_sql = ", ".join(
                    quote_identifier(column)
                    for column in columns
                )

                # Build parameter list.
                parameter_sql = ", ".join(
                    f":p{i}"
                    for i in range(len(columns))
                )

                insert_sql = text(
                    f'''
                    INSERT INTO "{table}"
                    ({column_sql})
                    VALUES ({parameter_sql})
                    '''
                )

                # ------------------------------------------------
                # Insert each row
                # ------------------------------------------------

                for row in rows:

                    params = {}

                    for i, column in enumerate(columns):

                        value = row[i]

                        # =================================================
                        # BOOLEAN CONVERSION
                        # =================================================
                        #
                        # SQLite commonly stores Boolean values as:
                        #
                        #     1 = True
                        #     0 = False
                        #
                        # PostgreSQL expects a Boolean value.
                        #
                        if (
                            column == "is_active"
                            and table in {"users", "products"}
                        ):

                            value = bool(value)

                        # =================================================
                        # LEGACY SHIPMENT BARCODE
                        # =================================================
                        #
                        # Old SQLite records may contain:
                        #
                        #     shipment_barcode = ""
                        #
                        # Current PostgreSQL schema requires this field
                        # to be non-null and unique.
                        #
                        # Therefore generate a deterministic legacy
                        # barcode based on the existing sale_item ID.
                        #
                        if (
                            table == "sale_items"
                            and column == "shipment_barcode"
                        ):

                            if (
                                value is None
                                or str(value).strip() == ""
                            ):

                                value = (
                                    f"LEGACY-SHIP-{row['id']:06d}"
                                )

                        params[f"p{i}"] = value

                    connection.execute(
                        insert_sql,
                        params,
                    )

                print(
                    f"{table:16} "
                    f"{len(rows):4} rows imported"
                )

            # ------------------------------------------------
            # STEP 6
            # Reset PostgreSQL ID sequences
            # ------------------------------------------------

            print()
            print("Resetting PostgreSQL ID sequences...")
            print("-" * 70)

            for table in TABLES:

                max_id = connection.execute(
                    text(
                        f'''
                        SELECT MAX(id)
                        FROM "{table}"
                        '''
                    )
                ).scalar()

                # If table contains rows, update sequence.
                if max_id is not None:

                    sequence_name = connection.execute(
                        text(
                            """
                            SELECT pg_get_serial_sequence(
                                :table_name,
                                'id'
                            )
                            """
                        ),
                        {
                            "table_name": table
                        },
                    ).scalar()

                    if sequence_name:

                        connection.execute(
                            text(
                                """
                                SELECT setval(
                                    CAST(:sequence_name AS regclass),
                                    :max_id,
                                    true
                                )
                                """
                            ),
                            {
                                "sequence_name": sequence_name,
                                "max_id": max_id,
                            },
                        )

                        print(
                            f"{table:16} "
                            f"sequence set to {max_id}"
                        )

            # ------------------------------------------------
            # STEP 7
            # Verify row counts BEFORE COMMIT
            # ------------------------------------------------

            print()
            print("Verifying row counts...")
            print("-" * 70)

            migration_ok = True

            for table in TABLES:

                source_count = len(
                    source_data[table]["rows"]
                )

                target_count = connection.execute(
                    text(
                        f'SELECT COUNT(*) '
                        f'FROM "{table}"'
                    )
                ).scalar()

                print(
                    f"{table:16} "
                    f"SQLite={source_count:4} "
                    f"PostgreSQL={target_count:4}"
                )

                if source_count != target_count:

                    migration_ok = False

            # ------------------------------------------------
            # STEP 8
            # Stop migration if counts don't match
            # ------------------------------------------------

            if not migration_ok:

                raise RuntimeError(
                    "Row count verification failed. "
                    "PostgreSQL transaction will be rolled back."
                )

            print()
            print("All row counts match.")

        # =====================================================
        # TRANSACTION COMMITTED
        # =====================================================

        print()
        print("=" * 70)
        print("MIGRATION SUCCESSFUL")
        print("=" * 70)

        print()
        print("PostgreSQL transaction committed.")
        print("SQLite database was NOT modified.")
        print()

    except Exception as exc:

        # =====================================================
        # TRANSACTION ROLLED BACK
        # =====================================================

        print()
        print("=" * 70)
        print("MIGRATION FAILED")
        print("=" * 70)

        print()
        print(f"Error: {exc}")
        print()

        print(
            "PostgreSQL transaction was rolled back."
        )

        print(
            "SQLite database was NOT modified."
        )

        print()

        raise


# ============================================================
# SCRIPT ENTRY POINT
# ============================================================

if __name__ == "__main__":
    migrate()