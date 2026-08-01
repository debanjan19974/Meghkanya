from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.product import Product
from app.models.stock_ledger import StockLedger
from app.models.user import User
from app.schemas.inventory import StockAdjustRequest, StockAdjustResponse

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.post("/adjust", response_model=StockAdjustResponse)
def adjust_stock(
    payload: StockAdjustRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> StockAdjustResponse:
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    updated_stock = product.stock_quantity + payload.quantity_change
    if updated_stock < 0:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    product.stock_quantity = updated_stock
    ledger = StockLedger(
        product_id=product.id,
        movement_type="adjustment",
        quantity_change=payload.quantity_change,
        note=payload.note,
    )
    db.add(ledger)
    db.commit()
    return StockAdjustResponse(product_id=product.id, updated_stock=updated_stock)
