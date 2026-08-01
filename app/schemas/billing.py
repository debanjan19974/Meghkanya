from decimal import Decimal

from pydantic import BaseModel


class SaleItemCreate(BaseModel):
    product_id: int
    quantity: int


class SaleCreateRequest(BaseModel):
    payment_mode: str = "cash"
    discount_amount: Decimal = Decimal("0")
    gst_amount: Decimal = Decimal("0")
    customer_name: str
    customer_phone: str
    shipping_address: str
    items: list[SaleItemCreate]


class SaleLabelItem(BaseModel):
    product_id: int
    name: str
    barcode: str
    quantity: int
    shipment_barcode: str


class SaleResponse(BaseModel):
    sale_id: int
    invoice_no: str
    total_amount: Decimal
    customer_name: str
    customer_phone: str
    shipping_address: str
    items: list[SaleLabelItem]
