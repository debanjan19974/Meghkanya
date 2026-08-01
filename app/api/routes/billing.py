from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.models.stock_ledger import StockLedger
from app.models.user import User
from app.schemas.billing import SaleCreateRequest, SaleResponse

router = APIRouter(prefix="/billing", tags=["billing"])


def _next_invoice_no(db: Session) -> str:
    latest = db.query(Sale).order_by(Sale.id.desc()).first()
    seq = 1 if not latest else latest.id + 1
    return f"SK-{seq:06d}"


@router.post("/sales", response_model=SaleResponse)
def create_sale(
    payload: SaleCreateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> SaleResponse:
    if not payload.items:
        raise HTTPException(status_code=400, detail="At least one item is required")

    subtotal = Decimal("0")
    product_rows: list[tuple[Product, int, Decimal]] = []

    for item in payload.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be greater than zero")
        if product.stock_quantity < item.quantity:
            raise HTTPException(
                status_code=400, detail=f"Insufficient stock for {product.name}"
            )
        line_total = Decimal(product.sell_price) * item.quantity
        subtotal += line_total
        product_rows.append((product, item.quantity, line_total))

    total_amount = subtotal - payload.discount_amount + payload.gst_amount
    sale = Sale(
        invoice_no=_next_invoice_no(db),
        payment_mode=payload.payment_mode,
        subtotal=subtotal,
        discount_amount=payload.discount_amount,
        gst_amount=payload.gst_amount,
        total_amount=total_amount,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        shipping_address=payload.shipping_address,
    )
    db.add(sale)
    db.flush()

    label_items = []
    item_index = 1
    for product, quantity, line_total in product_rows:
        product.stock_quantity -= quantity
        shipment_barcode = f"{sale.invoice_no}-{product.barcode}-{item_index}"
        db.add(
            SaleItem(
                sale_id=sale.id,
                product_id=product.id,
                quantity=quantity,
                selling_price=product.sell_price,
                line_total=line_total,
                shipment_barcode=shipment_barcode,
            )
        )
        db.add(
            StockLedger(
                product_id=product.id,
                movement_type="sale",
                quantity_change=-quantity,
                reference_type="sale",
                reference_id=sale.id,
                note=f"Invoice {sale.invoice_no}",
            )
        )
        label_items.append(
            {
                "product_id": product.id,
                "name": product.name,
                "barcode": product.barcode,
                "quantity": quantity,
                "shipment_barcode": shipment_barcode,
            }
        )
        item_index += 1

    db.commit()
    return SaleResponse(
        sale_id=sale.id,
        invoice_no=sale.invoice_no,
        total_amount=total_amount,
        customer_name=sale.customer_name,
        customer_phone=sale.customer_phone,
        shipping_address=sale.shipping_address,
        items=label_items,
    )
