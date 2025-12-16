# TOEFL Speaking Practice - Setup Guide

This guide will help you set up and run the TOEFL Speaking Practice application on your machine.

## Prerequisites

- **Python 3.10+** (Python 3.9 is not supported due to dependencies)
- **Node.js 18+** and npm
- **Docker** and Docker Compose
- **PostgreSQL client** (psql) - for running migrations
- **OpenAI API Key** - for AI analysis features

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd TOFEL-demo
```

### 2. Backend Setup

#### 2.1 Start Docker Services

```bash
cd backend
docker-compose up -d
```

This will start:
- PostgreSQL database (port 5432)
- MinIO object storage (port 9000 for API, 9001 for console)

Wait ~10 seconds for services to be healthy:

```bash
docker-compose ps
```

#### 2.2 Create Python Virtual Environment

**On macOS/Linux:**

```bash
# Use Python 3.10 or higher
python3.10 -m venv .venv
source .venv/bin/activate
```

**On Windows:**

```bash
python -m venv .venv
.venv\Scripts\activate
```

#### 2.3 Install Dependencies

```bash
pip install --upgrade pip
pip install uv
uv pip install -e .
```

#### 2.4 Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
# Database
DATABASE_URL=postgresql+asyncpg://toefl:toefl123@localhost:5432/toefl_speaking

# MinIO (S3-compatible storage)
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_SECURE=false

# OpenAI API (Required for AI features)
OPENAI_API_KEY=your_openai_api_key_here

# Volcengine (Optional - legacy support)
VOLCENGINE_API_KEY=
VOLCENGINE_APP_ID=
```

**Important:** Replace `your_openai_api_key_here` with your actual OpenAI API key.

#### 2.5 Run Database Migrations

```bash
# Install PostgreSQL client if needed
pip install psycopg2-binary

# Run migrations
for file in migrations/postgres/*.sql; do
  echo "Running $file..."
  psql postgresql://toefl:toefl123@localhost:5432/toefl_speaking -f "$file"
done
```

#### 2.6 Initialize MinIO Buckets

```bash
python -c "
from app.services.storage_service import storage_service
import asyncio
asyncio.run(storage_service.ensure_buckets())
"
```

#### 2.7 Start Backend Server

```bash
uvicorn app.app:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at: http://localhost:8000

API documentation: http://localhost:8000/docs

### 3. Frontend Setup

Open a new terminal window:

```bash
cd frontend
```

#### 3.1 Install Dependencies

```bash
npm install
```

#### 3.2 Configure Environment Variables

Create a `.env` file in the `frontend` directory:

```bash
# Backend API Configuration
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

#### 3.3 Start Frontend Development Server

```bash
npm run dev
```

The frontend will be available at: http://localhost:5173

## Testing the Application

1. Open your browser and navigate to http://localhost:5173
2. You should see the TOEFL Speaking Practice interface
3. Click on a question to start practicing
4. Record your answer using your microphone
5. Submit for AI analysis
6. View your detailed feedback report

## Project Structure

```
TOFEL-demo/
├── backend/
│   ├── app/                    # FastAPI application
│   │   ├── models/            # SQLAlchemy models
│   │   ├── routers/           # API endpoints
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic
│   │   │   └── ai/           # AI services (ASR, LLM)
│   │   └── app.py            # FastAPI app entry point
│   ├── migrations/            # Database migrations
│   ├── docker-compose.yml     # Docker services
│   ├── pyproject.toml         # Python dependencies
│   └── .env                   # Environment variables
│
└── frontend/
    ├── src/
    │   ├── app/              # React components
    │   ├── hooks/            # Custom React hooks
    │   ├── services/         # API client
    │   └── main.tsx          # Entry point
    ├── package.json          # Node dependencies
    └── .env                  # Environment variables
```

## Troubleshooting

### Backend Issues

**Port 5432 already in use:**
```bash
# Check what's using the port
lsof -i :5432
# Stop local PostgreSQL if running
brew services stop postgresql
```

**MinIO connection errors:**
```bash
# Restart Docker containers
cd backend
docker-compose restart
```

**Database migration errors:**
```bash
# Reset database (WARNING: deletes all data)
docker-compose down -v
rm -rf data/postgres
docker-compose up -d
# Wait 10 seconds, then re-run migrations
```

### Frontend Issues

**API connection errors:**
- Verify backend is running on port 8000
- Check `.env` file has correct `VITE_API_BASE_URL`
- Check browser console for CORS errors

**Build errors:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

## Development Notes

### Python Version Requirement

The project requires **Python 3.10 or higher** due to:
- `pydantic-settings>=2.12.0` requires Python 3.10+
- Modern type hints (e.g., `dict | None`) used throughout

If you only have Python 3.9, you'll need to install Python 3.10+:

**macOS (Homebrew):**
```bash
brew install python@3.10
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install python3.10 python3.10-venv
```

### Database Schema

The application uses PostgreSQL with the following main tables:
- `questions` - TOEFL speaking questions
- `recordings` - User audio recordings
- `analysis_results` - AI-generated feedback (JSON format)

### AI Workflow

1. **Audio Upload** → MinIO storage
2. **Transcription** → OpenAI Whisper API
3. **Analysis** → OpenAI GPT-4o with structured outputs
4. **Scoring** → Python logic calculates total score and level
5. **Report** → JSON format returned to frontend

## Production Deployment

For production deployment, consider:

1. **Environment Variables:**
   - Use secure secrets management
   - Never commit `.env` files to git

2. **Database:**
   - Use managed PostgreSQL (e.g., AWS RDS, Supabase)
   - Set up regular backups

3. **Object Storage:**
   - Use production S3 or S3-compatible service
   - Configure proper access policies

4. **Backend:**
   - Use production ASGI server (Gunicorn + Uvicorn workers)
   - Set up reverse proxy (Nginx)
   - Enable HTTPS

5. **Frontend:**
   - Build production bundle: `npm run build`
   - Serve via CDN or static hosting
   - Update `VITE_API_BASE_URL` to production backend

## License

[Your License Here]

## Support

For issues or questions, please open an issue on GitHub.

