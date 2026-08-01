from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.billing import router as billing_router
from app.api.routes.inventory import router as inventory_router
from app.api.routes.products import router as products_router

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(products_router)
api_router.include_router(inventory_router)
api_router.include_router(billing_router)
