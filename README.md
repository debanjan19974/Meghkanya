# Meghkanya Inventory + Billing

Meghkanya is a barcode-first inventory and billing platform for saree retail, with a FastAPI backend and a React frontend.

## Included in this scaffold

- PostgreSQL schema (`sql/schema.sql`)
- FastAPI backend with:
  - auth login endpoint
  - products CRUD starter (create/list + barcode search)
  - inventory stock adjustment endpoint
  - billing sale creation with stock deduction + stock ledger write
- Default local bootstrap user:
  - username: `admin`
  - password: `admin123`

## Project structure

`app/main.py` - FastAPI app startup and table bootstrap  
`app/models/` - SQLAlchemy models  
`app/api/routes/` - API route modules  
`app/schemas/` - Request/response Pydantic models  
`sql/schema.sql` - production-oriented SQL design

## Run locally

1. Copy env:
   - `copy .env.example .env` (Windows)
2. Install dependencies:
   - `pip install -r requirements.txt`
3. Start app:
   - `uvicorn app.main:app --reload`

The default `.env` example uses local SQLite for quick startup.

## API docs

- Swagger: `http://127.0.0.1:8000/docs`
- Health: `http://127.0.0.1:8000/health`

## Frontend inventory module (Step 3 + 4)

1. Open new terminal:
   - `cd frontend`
2. Install:
   - `npm install`
3. Start:
   - `npm run dev`

Optional frontend env:
- copy `frontend/.env.example` to `frontend/.env`
- set `VITE_API_BASE_URL` when your backend is not on localhost

Frontend runs at `http://127.0.0.1:5173` and includes:
- product create form
- barcode-first lookup (USB scanner compatible)
- stock adjustment from scan result
- inventory table with low-stock count
- billing counter (scan-to-cart, discount, GST, checkout)

## Seed sample data (quick test setup)

Run once from project root:
- `python scripts/seed_data.py`

This creates:
- default admin user (`admin` / `admin123`) if missing
- 1 sample supplier
- 5 sample saree products with barcodes (`SR1001` to `SR1005`)

## AWS deployment

Production deployment files included:

- [Dockerfile](/d:/Meghkanya/Dockerfile)
- [frontend/amplify.yml](/d:/Meghkanya/frontend/amplify.yml)
- [AWS_DEPLOYMENT.md](/d:/Meghkanya/AWS_DEPLOYMENT.md)

Recommended AWS architecture:

- Frontend: Amplify Hosting
- Backend: ECS Fargate
- Database: RDS PostgreSQL

Before production:

- switch `DATABASE_URL` to RDS PostgreSQL
- set `CORS_ORIGINS` to your live frontend URLs
- configure a strong `SECRET_KEY`
- set your own admin bootstrap values
- turn `BOOTSTRAP_ADMIN_ENABLED=false` after first login

## Next build steps

- Add purchase API and supplier CRUD
- Add barcode-first billing UI in frontend
- Add PDF invoices + WhatsApp sharing
- Add analytics/report endpoints and dashboard
- Move from `create_all` to Alembic migrations for production
