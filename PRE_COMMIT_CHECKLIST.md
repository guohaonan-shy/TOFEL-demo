# Pre-Commit Checklist

Before pushing to the repository, ensure all these items are completed:

## ✅ Environment Files

- [ ] `backend/.env` is in `.gitignore` (DO NOT commit)
- [ ] `frontend/.env` is in `.gitignore` (DO NOT commit)
- [ ] Create `backend/.env.example` with placeholder values
- [ ] Create `frontend/.env.example` with placeholder values

## ✅ Documentation

- [x] `README.md` exists with project overview
- [x] `SETUP.md` exists with detailed setup instructions
- [x] `.gitignore` is properly configured
- [ ] API documentation is accessible at `/docs` endpoint
- [ ] All configuration options are documented

## ✅ Code Quality

- [x] No hardcoded API keys or secrets
- [x] All Python dependencies listed in `pyproject.toml`
- [x] All Node dependencies listed in `package.json`
- [ ] No debug print statements in production code
- [ ] No commented-out code blocks

## ✅ Database

- [x] All migrations are in `backend/migrations/postgres/`
- [x] Migrations are numbered sequentially (001, 002, 003...)
- [x] Seed data is included for testing
- [ ] No sensitive data in migrations

## ✅ Testing

- [x] Backend starts without errors
- [x] Frontend starts without errors
- [x] Docker services start successfully
- [x] Database migrations run successfully
- [x] API endpoints return expected responses
- [ ] Frontend can connect to backend
- [ ] Full workflow (record → analyze → report) works

## ✅ Security

- [x] `.env` files are gitignored
- [x] No API keys in code
- [x] CORS is properly configured
- [ ] Rate limiting considered for production
- [ ] Input validation is in place

## ✅ Repository Structure

```
TOFEL-demo/
├── .gitignore              ✅
├── README.md               ✅
├── SETUP.md                ✅
├── backend/
│   ├── .env.example        ⚠️ TODO
│   ├── app/                ✅
│   ├── migrations/         ✅
│   ├── docker-compose.yml  ✅
│   └── pyproject.toml      ✅
└── frontend/
    ├── .env.example        ⚠️ TODO
    ├── src/                ✅
    ├── package.json        ✅
    └── vite.config.ts      ✅
```

## 🔧 Quick Actions Before Commit

### 1. Create Example Environment Files

```bash
# Backend
cat > backend/.env.example << 'EOF'
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
EOF

# Frontend
cat > frontend/.env.example << 'EOF'
# Backend API Configuration
VITE_API_BASE_URL=http://localhost:8000/api/v1
EOF
```

### 2. Verify .gitignore

```bash
# Check that sensitive files are ignored
git status --ignored
```

### 3. Clean Up

```bash
# Remove any test data or temporary files
cd backend
rm -rf data/postgres/*  # Will be recreated by Docker
rm -rf __pycache__
find . -name "*.pyc" -delete

cd ../frontend
rm -rf node_modules  # Will be reinstalled
rm -rf dist
```

### 4. Test Clean Setup

```bash
# In a new terminal, test the setup from scratch
cd /tmp
git clone <your-repo-url> test-setup
cd test-setup
# Follow SETUP.md instructions
```

## 📝 Commit Message Template

```
feat: Initial commit - TOEFL Speaking Practice Application

- FastAPI backend with OpenAI integration
- React/TypeScript frontend with real-time recording
- Docker-compose setup for PostgreSQL and MinIO
- AI-powered speech analysis with GPT-4o
- Comprehensive setup documentation

Features:
- Real-time audio recording
- OpenAI Whisper transcription
- GPT-4o analysis with structured outputs
- Interactive report UI with sentence-by-sentence feedback
- Score calculation (0-30 scale)
```

## 🚀 Post-Push Checklist

After pushing to GitHub:

- [ ] Verify README renders correctly on GitHub
- [ ] Check that .env files are NOT in the repository
- [ ] Test clone on a different machine
- [ ] Set up GitHub Actions (optional)
- [ ] Add repository description and topics
- [ ] Add license file
- [ ] Enable GitHub Issues
- [ ] Create initial release/tag

## 🔐 Security Review

Before making the repository public:

- [ ] No API keys in commit history
- [ ] No passwords in commit history
- [ ] No sensitive user data
- [ ] All secrets are in .env files
- [ ] .env files are properly gitignored

## 📊 Repository Settings (GitHub)

Recommended settings:

- [ ] Add description: "AI-powered TOEFL Speaking practice with real-time feedback"
- [ ] Add topics: `toefl`, `speaking`, `ai`, `fastapi`, `react`, `openai`, `education`
- [ ] Add website: (if deployed)
- [ ] Enable Issues
- [ ] Enable Discussions (optional)
- [ ] Add LICENSE file
- [ ] Set up branch protection for main

## ✨ Optional Enhancements

- [ ] Add CI/CD with GitHub Actions
- [ ] Add code coverage badges
- [ ] Add demo video or GIF
- [ ] Add screenshots to README
- [ ] Create CONTRIBUTING.md
- [ ] Add CODE_OF_CONDUCT.md
- [ ] Set up automated dependency updates (Dependabot)

