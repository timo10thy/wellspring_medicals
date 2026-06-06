# Wellspring Medicals — Pharmacy Inventory & Sales System

A full-stack pharmacy management system built for Wellspring Medics. Handles daily transactions, stock tracking, sales recording, expense management, purchase receipts, and business analytics — all in one place.

> Built with FastAPI, Vanilla JS, MySQL, Docker, and Nginx.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python), SQLAlchemy, MySQL |
| Frontend | Vanilla JS (ES Modules), Tailwind CSS |
| Server | Nginx (reverse proxy + static files) |
| Database | MySQL 8.0 via Docker |
| Container | Docker + Docker Compose |

---

## Features

### Authentication & Access Control
- JWT-based authentication with role-based access
- Two roles: **ADMIN** and **USER** — each with protected routes on both frontend and backend
- One-time secure token for initial admin setup

### Product Management
- Create, update, and deactivate products
- Each product tracks name, price, description, and active status

### Stock Management
- Add stock by product name (no ID lookup required)
- FEFO (First Expiry, First Out) stock selection on every sale
- Total stock view per product with low stock and out-of-stock indicators
- Consumption analysis showing average daily usage and days remaining

### Expiry Alerts
- Flags stock expiring within 180 days
- Colour-coded urgency levels: warning → critical → expired
- Automatically excludes fully sold stock from alerts

### Sales
- Cart-style multi-item sales — one receipt, multiple products
- Live product search with real-time stock availability
- Out-of-stock products visible but blocked from selection
- Selling price validation (price overrides require admin approval)
- Receipt lookup by sale ID

### Expense Tracking
- Record expenses by category: `GOODS_PURCHASE`, `OPERATING_EXPENSE`, `TRANSPORT`, `RENT`, `OTHER`
- Edit and delete expense records
- Monthly expense tracker with profit-tier investment advice

### Purchase Receipts
- Record supplier purchases with multiple line items per receipt
- Auto-generated receipt numbers
- Supplier search with per-item tracking of quantity, unit cost, expiry date, and restock level

### Reports & Analytics
- **Daily / Weekly / Monthly / Yearly** summaries — sales, expenses, purchases, profit
- **Top Selling Products** — ranked by units sold for any period
- **Expense Breakdown** — per category with visual progress bars
- **Expiry Alerts Report** — full table with stock value and recommended action
- **Consumption Report** — per stock ID with consumed percentage bar

### Dashboard
- Today's sales (total amount + transaction count)
- Low stock and out-of-stock counts at a glance
- Monthly profit estimate (revenue − expenses − purchases)
- Low stock alerts table and 10 most recent sales

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

Use the setup token defined in `docker-compose.yml` under `ADMIN_SETUP_TOKEN`:

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

| Service | URL |
|---|---|
| Frontend | http://localhost:3001 |
| Backend API | http://localhost:8002 |
| Swagger Docs | http://localhost:8002/docs |
| phpMyAdmin | http://localhost:8081 |

---

## Environment Variables

Set in `docker-compose.yml` under the `backend` service:

| Variable | Description |
|---|---|
| `DB_HOST` | MySQL host (`db` inside Docker) |
| `DB_DATABASE` | Database name |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `JWT_SECRET_KEY` | Secret key for signing JWT tokens |
| `JWT_ALGORITHM` | Signing algorithm (default: HS256) |
| `JWT_EXPIRATION_KEY` | Token expiry duration in minutes |
| `ADMIN_SETUP_TOKEN` | One-time token for first admin creation |

---

## API Overview

| Prefix | Description |
|---|---|
| `/auth` | Login, registration |
| `/admin` | Admin setup and info |
| `/product` | Product CRUD |
| `/stock` | Stock management and expiry alerts |
| `/sales` | Sales creation and receipt lookup |
| `/expenses` | Expense tracking |
| `/purchase-receipts` | Supplier purchase records |
| `/dashboard` | Analytics summary |
| `/reports` | Period-based business reports |

Full interactive documentation available at `/docs` via Swagger UI.

---

## Project Structure

```
wellspring_medicals/
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

## Rebuilding After Changes

```bash
# Full rebuild
docker compose down
docker compose build --no-cache
docker compose up -d

# Frontend only
docker compose build --no-cache frontend && docker compose up -d frontend

# Backend only (Python changes with volume mount — no rebuild needed)
docker compose restart backend
```

---

## License

Private — Wellspring Medics internal system.