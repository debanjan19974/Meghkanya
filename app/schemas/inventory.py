from pydantic import BaseModel


class StockAdjustRequest(BaseModel):
    product_id: int
    quantity_change: int
    note: str | None = None


class StockAdjustResponse(BaseModel):
    product_id: int
    updated_stock: int
