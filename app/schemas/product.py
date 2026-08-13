from decimal import Decimal

from pydantic import BaseModel


class ProductCreate(BaseModel):
    barcode: str
    name: str
    category: str | None = None
    buy_price: Decimal
    sell_price: Decimal
    stock_quantity: int = 0
    supplier_id: int | None = None
    image_url: str | None = None


class ProductUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    buy_price: Decimal | None = None
    sell_price: Decimal | None = None
    stock_quantity: int | None = None
    supplier_id: int | None = None
    image_url: str | None = None
    is_active: bool | None = None


class ProductResponse(BaseModel):
    id: int
    barcode: str
    name: str
    category: str | None
    buy_price: Decimal
    sell_price: Decimal
    stock_quantity: int
    supplier_id: int | None
    image_url: str | None
    is_active: bool

    class Config:
        from_attributes = True
