# PharmaIMS — Wellspring Medics Inventory Management System

A full-stack pharmacy inventory and sales management system built for Wellspring Medics. It handles daily transactions, stock tracking, sales recording, expense management, purchase receipts, and business analytics — all in one place.

---

## Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Backend   | FastAPI (Python), SQLAlchemy, MySQL     |
| Frontend  | Vanilla JS (ES Modules), Tailwind CSS   |
| Server    | Nginx (reverse proxy + static files)    |
| Database  | MySQL 8.0 via Docker                   |
| Container | Docker + Docker Compose                 |

---

## Features

### 🔐 Authentication & Roles
- JWT-based authentication
- Two roles: **ADMIN** and **USER**
- Admin-only setup via secure token
- Protected routes per role on both frontend and backend

### 📦 Products
- Create, update, deactivate products
- Each product has a name, price, description, and active status

### 🗃️ Stock Management
- Add stock by product name (no ID required)
- FEFO (First Expiry, First Out) stock selection on sales
- Total stock view per product
- Low stock and out-of-stock indicators
- Stock consumption analysis (avg daily usage, days remaining)

### 💊 Expiry Alerts
- Alerts for stock expiring within 180 days
- Colour-coded urgency levels (warning → critical → expired)
- Automatically excludes fully sold stock from alerts

### 🧾 Sales
- Cart-style multi-item sales (one receipt, multiple products)
- Search products by name with live availability
- Out-of-stock products shown but blocked from selection
- Selling price validation (cannot exceed product price without admin)
- Receipt lookup by sale ID

### 💰 Expenses
- Record operating expenses by category (GOODS_PURCHASE, OPERATING_EXPENSE, TRANSPORT, RENT, OTHER)
- Edit and delete expenses
- Monthly expense tracker with investment advice based on profit tier

### 🛒 Purchase Receipts
- Record supplier purchases with multiple line items
- Auto-generated receipt numbers
- Supplier search
- Tracks quantity purchased, unit cost, expiry date, restock level per item

### 📊 Reports
- **Daily Summary** — sales, operating expenses (excludes goods purchase), profit
- **Weekly Summary** — sales, all expenses, purchases/restock, top products
- **Monthly Summary** — same as weekly with broader date range
- **Yearly Summary** — full year overview
- **Top Selling Products** — ranked by units sold for any period
- **Expense Breakdown** — per category with visual progress bars
- **Expiry Alerts** — full table with stock value and recommended action
- **Consumption Report** — per stock ID with consumed % bar

### 🏠 Dashboard Analytics
- Sales today (amount + transaction count)
- Low stock and out-of-stock counts
- Monthly profit estimate (revenue − expenses − purchases)
- Low stock alerts table
- Recent 10 sales

---

## Project Structure

```
pharma-inventory-system/
├── backend/
│   ├── app/
│   │   ├── auth/           # JWT helpers
│   │   ├── middlewares/    # Auth + Admin guards
│   │   ├── models/         # SQLAlchemy models
│   │   ├── routes/         # API endpoints
│   │   └── schema/         # Pydantic schemas
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── js/             # api.js, auth.js, router.js, ui.js, main.js
│   │   ├── pages/          # One file per page
│   │   └── styles/         # CSS theme
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Getting Started

### Prerequisites
- Docker
- Docker Compose

### 1. Clone the repository
```bash
git clone https://github.com/timo10thy/wellspring_medicals.git
cd wellspring_medicals
```

### 2. Start all services
```bash
docker compose up --build -d
```

### 3. Create the first admin account

The admin account is created once via a protected endpoint. Use the setup token defined in `docker-compose.yml` under `ADMIN_SETUP_TOKEN`.

```bash
curl -X POST "http://localhost:8002/admin/create?setup_token=pharma-admin-2024-xK9mP3" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin Name",
    "email": "admin@wellspring.com",
    "user_name": "admin",
    "password": "yourpassword"
  }'
```

### 4. Access the app

| Service      | URL                          |
|--------------|------------------------------|
| Frontend     | http://localhost:3001        |
| Backend API  | http://localhost:8002        |
| Swagger Docs | http://localhost:8002/docs   |
| phpMyAdmin   | http://localhost:8081        |

---

## Environment Variables

Configured in `docker-compose.yml` under the `backend` service:

| Variable            | Description                        |
|---------------------|------------------------------------|
| `DB_HOST`           | MySQL host (use `db` in Docker)    |
| `DB_DATABASE`       | Database name                      |
| `DB_USER`           | Database user                      |
| `DB_PASSWORD`       | Database password                  |
| `JWT_SECRET_KEY`    | Secret key for signing JWT tokens  |
| `JWT_ALGORITHM`     | Algorithm (default: HS256)         |
| `JWT_EXPIRATION_KEY`| Token expiry in minutes            |
| `ADMIN_SETUP_TOKEN` | One-time token for admin creation  |

---

## API Overview

| Prefix               | Description                   |
|----------------------|-------------------------------|
| `/auth`              | Login, register               |
| `/admin`             | Admin setup, admin info       |
| `/product`           | Product CRUD                  |
| `/stock`             | Stock management + alerts     |
| `/sales`             | Sales creation + receipts     |
| `/expenses`          | Expense tracking              |
| `/purchase-receipts` | Supplier purchase records     |
| `/dashboard`         | Analytics summary             |
| `/reports`           | Period-based business reports |

Full interactive documentation available at `/docs` (Swagger UI).

---

## Rebuilding After Changes

```bash
# Full rebuild (clears Docker cache)
docker compose down
docker compose build --no-cache
docker compose up -d

# Frontend only
docker compose build --no-cache frontend && docker compose up -d frontend

# Backend only (no rebuild needed for Python changes with volume mount)
docker compose restart backend
```

---

## License

Private — Wellspring Medics internal system.