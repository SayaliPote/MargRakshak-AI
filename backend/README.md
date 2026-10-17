# MargRakshak AI — Backend Service

FastAPI + PostgreSQL/PostGIS + HDBSCAN backend service for the **AI-Based Accident Hotspot Detection and Risk Prediction System**.

---

## Features
- **RESTful Architecture**: Modular routers, Pydantic schemas, and structured error responses.
- **CORS Configured**: Ready for the React / Vite frontend (`http://localhost:5173`).
- **Geospatial & ML Ready**: Designed for PostGIS spatial queries and HDBSCAN hotspot clustering.
- **Auto-Documented**: Interactive Swagger UI at `/docs` and ReDoc at `/redoc`.

---

## Directory Structure
```
backend/
├── app/
│   ├── main.py                  # Application entry point & CORS
│   ├── core/
│   │   ├── config.py            # Pydantic Settings & environment loader
│   │   ├── security.py          # JWT and bcrypt security (Phase 3)
│   │   └── dependencies.py      # Database session and user auth dependencies
│   ├── database/                # SQLAlchemy & PostGIS connection (Phase 2)
│   ├── models/                  # SQLAlchemy ORM database models (Phase 2)
│   ├── schemas/                 # Pydantic validation schemas
│   ├── routers/                 # Modular API endpoints
│   ├── services/                # Business logic services
│   └── ml/                      # Preprocessing, HDBSCAN clustering & risk scoring
├── tests/                       # Pytest test suite
├── requirements.txt             # Project dependencies
├── .env.example                 # Environment configuration template
└── .env                         # Local active environment configuration
```

---

## Getting Started

### 1. Requirements
- Python 3.10+ (tested on Python 3.13)
- PostgreSQL with PostGIS extension (for Phase 2+)

### 2. Environment Setup
Copy the configuration template:
```bash
cp .env.example .env
```

### 3. Run the Backend Server
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 4. Verify Server & API Documentation
- Root Endpoint: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- Health Check: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)
- Interactive API Docs (Swagger): [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Alternative API Docs (ReDoc): [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## Running Automated Tests
```bash
python -m pytest tests/
```
