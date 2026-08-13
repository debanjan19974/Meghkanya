from collections import defaultdict
from decimal import Decimal
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.models.stock_ledger import StockLedger
from app.models.user import User
from app.schemas.billing import CustomerUpdateRequest

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _build_trend_series(sales, period: str):
    end = datetime.utcnow()
    labels = []
    values = []

    if period == "week":
        for offset in range(6, -1, -1):
            day = end - timedelta(days=offset)
            labels.append(day.strftime("%a"))
            values.append(Decimal("0"))
        bucket_map = {label: idx for idx, label in enumerate(labels)}
        for sale in sales:
            label = sale.sold_at.strftime("%a")
            if label in bucket_map:
                values[bucket_map[label]] += sale.total_amount

    elif period == "year":
        for offset in range(11, -1, -1):
            month_date = (end.replace(day=1) - timedelta(days=32 * offset))
            month_start = month_date.replace(day=1)
            labels.append(month_start.strftime("%b"))
            values.append(Decimal("0"))
        bucket_map = {label: idx for idx, label in enumerate(labels)}
        for sale in sales:
            label = sale.sold_at.strftime("%b")
            if label in bucket_map:
                values[bucket_map[label]] += sale.total_amount

    else:
        for offset in range(29, -1, -1):
            day = end - timedelta(days=offset)
            labels.append(day.strftime("%d"))
            values.append(Decimal("0"))
        bucket_map = {label: idx for idx, label in enumerate(labels)}
        for sale in sales:
            label = sale.sold_at.strftime("%d")
            if label in bucket_map:
                values[bucket_map[label]] += sale.total_amount

    return [{"label": label, "value": float(value)} for label, value in zip(labels, values)]


def _build_stock_intake_series(entries, period: str):
    end = datetime.utcnow()
    labels = []
    values = []

    if period == "week":
        for offset in range(6, -1, -1):
            day = end - timedelta(days=offset)
            labels.append(day.strftime("%a"))
            values.append(0)
        bucket_map = {label: idx for idx, label in enumerate(labels)}
        for entry in entries:
            label = entry.created_at.strftime("%a")
            if label in bucket_map:
                values[bucket_map[label]] += entry.quantity_change

    elif period == "year":
        for offset in range(11, -1, -1):
            month_date = (end.replace(day=1) - timedelta(days=32 * offset))
            month_start = month_date.replace(day=1)
            labels.append(month_start.strftime("%b"))
            values.append(0)
        bucket_map = {label: idx for idx, label in enumerate(labels)}
        for entry in entries:
            if entry.quantity_change <= 0:
                continue
            label = entry.created_at.strftime("%b")
            if label in bucket_map:
                values[bucket_map[label]] += entry.quantity_change

    else:
        for month_index in range(1, 13):
            month_label = datetime(end.year, month_index, 1).strftime("%b")
            labels.append(month_label)
            values.append(0)
        for entry in entries:
            if entry.quantity_change <= 0:
                continue
            label = entry.created_at.strftime("%b")
            if label in labels:
                values[labels.index(label)] += entry.quantity_change

    return [{"label": label, "value": float(value)} for label, value in zip(labels, values)]


@router.get("/stock")
def get_stock_analysis(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get stock analysis data"""
    products = db.query(Product).filter(Product.is_active == True).all()
    
    low_stock_items = [p for p in products if p.stock_quantity <= 5]
    high_stock_items = [p for p in products if p.stock_quantity > 20]
    total_inventory_value = sum(Decimal(p.buy_price) * p.stock_quantity for p in products)
    total_potential_revenue = sum(Decimal(p.sell_price) * p.stock_quantity for p in products)
    
    return {
        "total_products": len(products),
        "low_stock_count": len(low_stock_items),
        "high_stock_count": len(high_stock_items),
        "total_inventory_value": float(total_inventory_value),
        "total_potential_revenue": float(total_potential_revenue),
        "low_stock_items": [
            {
                "id": p.id,
                "name": p.name,
                "barcode": p.barcode,
                "stock_quantity": p.stock_quantity,
                "buy_price": float(p.buy_price),
                "sell_price": float(p.sell_price),
                "category": p.category
            }
            for p in low_stock_items
        ],
        "high_stock_items": [
            {
                "id": p.id,
                "name": p.name,
                "barcode": p.barcode,
                "stock_quantity": p.stock_quantity,
                "buy_price": float(p.buy_price),
                "sell_price": float(p.sell_price),
                "category": p.category
            }
            for p in high_stock_items
        ]
    }


@router.get("/sales")
def get_sales_analysis(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get sales analysis data"""
    sales = db.query(Sale).all()
    sale_items = db.query(SaleItem).all()
    
    total_sales_value = sum(s.total_amount for s in sales) if sales else Decimal("0")
    total_transactions = len(sales)
    
    # Top selling products
    product_sales = {}
    for item in sale_items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            if product.id not in product_sales:
                product_sales[product.id] = {
                    "name": product.name,
                    "barcode": product.barcode,
                    "total_quantity": 0,
                    "total_revenue": Decimal("0"),
                    "sell_price": product.sell_price
                }
            product_sales[product.id]["total_quantity"] += item.quantity
            product_sales[product.id]["total_revenue"] += item.line_total
    
    top_products = sorted(
        product_sales.values(),
        key=lambda x: x["total_revenue"],
        reverse=True
    )[:5]
    
    # Payment mode breakdown
    payment_modes = {}
    for sale in sales:
        if sale.payment_mode not in payment_modes:
            payment_modes[sale.payment_mode] = {"count": 0, "total": Decimal("0")}
        payment_modes[sale.payment_mode]["count"] += 1
        payment_modes[sale.payment_mode]["total"] += sale.total_amount
    
    return {
        "total_sales_value": float(total_sales_value),
        "total_transactions": total_transactions,
        "average_transaction_value": float(total_sales_value / total_transactions) if total_transactions > 0 else 0,
        "top_products": [
            {
                "name": p["name"],
                "barcode": p["barcode"],
                "total_quantity_sold": p["total_quantity"],
                "total_revenue": float(p["total_revenue"]),
                "sell_price": float(p["sell_price"])
            }
            for p in top_products
        ],
        "payment_modes": [
            {
                "mode": mode,
                "count": data["count"],
                "total": float(data["total"])
            }
            for mode, data in payment_modes.items()
        ]
    }


@router.get("/dashboard")
def get_dashboard_analysis(
    period: str = Query(default="month", regex="^(week|month|year)$"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get live sales and stock dashboard data with filterable trend charts."""
    end = datetime.utcnow()
    if period == "week":
        start = end - timedelta(days=6)
    elif period == "year":
        start = end.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start = end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    sales = db.query(Sale).filter(Sale.sold_at >= start, Sale.sold_at <= end).all()
    stock_entries = db.query(StockLedger).filter(
        StockLedger.created_at >= start,
        StockLedger.created_at <= end,
        StockLedger.quantity_change > 0,
    ).all()
    sale_items = db.query(SaleItem).all()
    sale_item_rows = []
    for sale in sales:
        for item in db.query(SaleItem).filter(SaleItem.sale_id == sale.id).all():
            product = db.query(Product).filter(Product.id == item.product_id).first()
            sale_item_rows.append({
                "category": product.category or "Uncategorized",
                "quantity": item.quantity,
                "total": item.line_total,
                "product_name": product.name,
            })

    category_totals = defaultdict(lambda: {"total_sales": Decimal("0"), "quantity": 0})
    for row in sale_item_rows:
        bucket = category_totals[row["category"]]
        bucket["total_sales"] += row["total"]
        bucket["quantity"] += row["quantity"]

    category_sales = [
        {
            "category": category,
            "total_sales": float(data["total_sales"]),
            "total_quantity": data["quantity"],
        }
        for category, data in sorted(category_totals.items(), key=lambda x: x[1]["total_sales"], reverse=True)
    ]

    total_sales_value = sum(Decimal(str(item["total"])) for item in sale_item_rows)
    total_quantity_sold = sum(item["quantity"] for item in sale_item_rows)

    stock_by_category = defaultdict(lambda: {"stock_quantity": 0, "stock_value": Decimal("0")})
    for product in db.query(Product).filter(Product.is_active == True).all():
        category = product.category or "Uncategorized"
        stock_by_category[category]["stock_quantity"] += product.stock_quantity
        stock_by_category[category]["stock_value"] += Decimal(str(product.buy_price)) * product.stock_quantity

    stock_categories = [
        {
            "category": category,
            "stock_quantity": data["stock_quantity"],
            "stock_value": float(data["stock_value"]),
        }
        for category, data in sorted(stock_by_category.items(), key=lambda x: x[1]["stock_quantity"], reverse=True)
    ]

    maximum = category_sales[0] if category_sales else {"category": "N/A", "total_sales": 0, "total_quantity": 0}
    minimum = category_sales[-1] if category_sales else {"category": "N/A", "total_sales": 0, "total_quantity": 0}

    total_stock_intake = sum(entry.quantity_change for entry in stock_entries)

    dashboard = {
        "period": period,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "summary": {
            "total_sales_value": float(total_sales_value),
            "total_transactions": len(sales),
            "total_quantity_sold": total_quantity_sold,
            "avg_transaction_value": float(total_sales_value / len(sales)) if sales else 0,
        },
        "stock_summary": {
            "total_stock_intake": total_stock_intake,
            "total_inventory_value": sum(
                float(product.buy_price) * product.stock_quantity for product in db.query(Product).filter(Product.is_active == True).all()
            )
        },
        "sales_trend": _build_trend_series(sales, period),
        "stock_intake_trend": _build_stock_intake_series(stock_entries, period),
        "category_sales": category_sales,
        "stock_by_category": stock_categories,
        "best_category": {
            "category": maximum["category"],
            "total_sales": maximum["total_sales"],
            "total_quantity": maximum["total_quantity"],
        },
        "lowest_category": {
            "category": minimum["category"],
            "total_sales": minimum["total_sales"],
            "total_quantity": minimum["total_quantity"],
        },
    }
    return dashboard


@router.get("/customers")
def get_customers_analysis(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get customer analysis data with purchase history"""
    sales = db.query(Sale).all()
    
    # Group sales by customer phone
    customers = {}
    for sale in sales:
        phone = sale.customer_phone
        if phone not in customers:
            customers[phone] = {
                "name": sale.customer_name,
                "phone": phone,
                "purchase_count": 0,
                "total_spent": Decimal("0"),
                "last_purchase_date": None,
                "purchases": []
            }
        
        customers[phone]["purchase_count"] += 1
        customers[phone]["total_spent"] += sale.total_amount
        customers[phone]["last_purchase_date"] = sale.sold_at
        customers[phone]["purchases"].append({
            "invoice_no": sale.invoice_no,
            "date": sale.sold_at.isoformat(),
            "amount": float(sale.total_amount),
            "payment_mode": sale.payment_mode
        })
    
    # Sort customers by total spent
    sorted_customers = sorted(
        customers.values(),
        key=lambda x: x["total_spent"],
        reverse=True
    )
    
    return {
        "total_customers": len(customers),
        "customers": [
            {
                "name": c["name"],
                "phone": c["phone"],
                "purchase_count": c["purchase_count"],
                "total_spent": float(c["total_spent"]),
                "average_purchase": float(c["total_spent"] / c["purchase_count"]) if c["purchase_count"] > 0 else 0,
                "last_purchase_date": c["last_purchase_date"].isoformat() if c["last_purchase_date"] else None,
                "purchases": c["purchases"]
            }
            for c in sorted_customers
        ]
    }


@router.patch("/customers/{customer_phone}")
def update_customer_details(
    customer_phone: str,
    payload: CustomerUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Correct the customer details recorded on all of their invoices."""
    original_phone = customer_phone.strip()
    name = payload.customer_name.strip()
    phone = payload.customer_phone.strip()

    if not name:
        raise HTTPException(status_code=400, detail="Customer name is required")
    if not phone:
        raise HTTPException(status_code=400, detail="Customer mobile number is required")

    sales = db.query(Sale).filter(Sale.customer_phone == original_phone).all()
    if not sales:
        raise HTTPException(status_code=404, detail="Customer record not found")

    for sale in sales:
        sale.customer_name = name
        sale.customer_phone = phone

    db.commit()
    return {"message": "Customer details updated", "updated_sales": len(sales)}
