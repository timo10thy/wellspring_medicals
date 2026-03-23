# Pharma Inventory System

A full-stack Pharmacy Inventory Management System with React frontend and FastAPI backend.

## Project Structure

```
pharma-inventory-system/
├── backend/          # FastAPI backend (copied from Spring project)
├── frontend/         # React frontend with TailwindCSS
├── docker-compose.yml
└── README.md
```

## Features

### Backend (FastAPI)
- Product management
- Stock tracking with expiry monitoring
- Sales management
- Role-based authentication (Admin/User)
- Expiry alerts (180-day window)
- PostgreSQL database with Alembic migrations

### Frontend (Vanilla JavaScript)
- Modern UI with TailwindCSS
- Admin dashboard for inventory management
- User interface for sales operations
- Authentication pages
- Real-time expiry alerts
- Responsive design
- **No React framework - pure vanilla JS**

## Port Configuration (Updated to avoid conflicts)

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:8002
- **Database**: localhost:3316
- **phpMyAdmin**: http://localhost:8081

## Quick Start

```bash
# Clone and start the full stack
git clone <repository-url>
cd pharma-inventory-system
docker-compose up --build
```

## Development

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
```

### Frontend (Vanilla JS + TailwindCSS)
```bash
cd frontend
npm install
npm run dev  # This runs both build and serve
```

Frontend will be available at http://localhost:3001

### TailwindCSS Build Commands
```bash
npm run build      # Watch mode for development
npm run build:prod # Production build (minified)
npm run serve      # Serve built files
```

## API Documentation
http://localhost:8002/docs

## Frontend Application
http://localhost:3001

## Database Management
Access phpMyAdmin at: http://localhost:8081
- Server: db
- Username: pharma_user
- Password: pharma_password

## Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM
- **MySQL** - Database
- **JWT** - Authentication
- **Alembic** - Database migrations

### Frontend
- **Vanilla JavaScript ES6+** - No framework dependency
- **TailwindCSS** - Utility-first CSS framework
- **TailwindCSS CLI** - Build system
- **Python HTTP Server** - Development server

### DevOps
- **Docker & Docker Compose** - Containerization
- **MySQL 8.0** - Database
- **phpMyAdmin** - Database management

## Authentication Flow

1. Users login via the vanilla JS frontend
2. JWT token is stored in localStorage
3. All API calls include the Bearer token
4. Role-based access control (Admin vs User)

## Project Notes

- **No React dependency** - Pure vanilla JavaScript implementation
- **TailwindCSS CLI** replaces create-react-app build system
- **Custom routing** implemented in JavaScript
- **Port conflicts resolved** - Uses non-conflicting ports
- **phpMyAdmin included** for easy database management
