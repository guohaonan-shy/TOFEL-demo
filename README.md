# TOEFL Speaking Practice Application

An AI-powered TOEFL Speaking practice platform that provides real-time feedback and detailed analysis of your speaking performance.

![TOEFL Speaking Practice](https://img.shields.io/badge/TOEFL-Speaking%20Practice-blue)
![Python](https://img.shields.io/badge/Python-3.10%2B-green)
![FastAPI](https://img.shields.io/badge/FastAPI-0.124%2B-teal)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## ✨ Features

### 🎤 Real-time Recording
- Browser-based audio recording using Web Audio API
- Visual feedback with waveform animation
- Pause/resume functionality
- 45-second recording timer

### 🤖 AI-Powered Analysis
- **Speech-to-Text**: OpenAI Whisper for accurate transcription with timestamps
- **Intelligent Scoring**: GPT-4o analyzes delivery, language use, and topic development
- **Structured Feedback**: Sentence-by-sentence analysis with grammar, expression, and improvement suggestions
- **Native Speaker Rewrites**: See how native speakers would phrase your sentences

### 📊 Comprehensive Reports
- **Overall Score**: 0-30 scale with performance level (Excellent/Good/Fair/Weak)
- **Component Breakdown**: Delivery, Language Use, and Topic Development scores
- **Interactive UI**: Expandable sentence cards with detailed feedback
- **Actionable Tips**: Specific recommendations for improvement

### 🎯 Practice Questions
- Pre-loaded TOEFL-style independent speaking questions
- SOS (Save Our Students) keywords and starter phrases
- Question audio playback

## 🏗️ Architecture

### Tech Stack

**Backend:**
- FastAPI (Python 3.10+)
- PostgreSQL (database)
- MinIO (S3-compatible object storage)
- OpenAI API (Whisper + GPT-4o)
- SQLAlchemy (ORM)
- Pydantic (data validation)

**Frontend:**
- React 18
- TypeScript
- Vite (build tool)
- Tailwind CSS
- Lucide React (icons)

**Infrastructure:**
- Docker & Docker Compose
- Uvicorn (ASGI server)

### System Flow

```
┌─────────────┐
│   Browser   │
│  (Frontend) │
└──────┬──────┘
       │
       │ 1. Fetch Questions
       ▼
┌─────────────────┐
│  FastAPI Server │
│    (Backend)    │
└────────┬────────┘
         │
         │ 2. Upload Audio
         ▼
    ┌────────┐
    │ MinIO  │
    │Storage │
    └────────┘
         │
         │ 3. Trigger Analysis (Background Task)
         ▼
    ┌──────────────┐
    │ OpenAI APIs  │
    │              │
    │ • Whisper    │ ──► Transcription
    │ • GPT-4o     │ ──► Analysis
    └──────────────┘
         │
         │ 4. Save Results
         ▼
    ┌──────────────┐
    │ PostgreSQL   │
    │   Database   │
    └──────────────┘
         │
         │ 5. Poll & Retrieve
         ▼
    ┌─────────────┐
    │   Frontend  │
    │ (Report UI) │
    └─────────────┘
```

## 🚀 Getting Started

### Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- Docker & Docker Compose
- OpenAI API Key

### Installation

See [SETUP.md](./SETUP.md) for detailed installation instructions.

**Quick Start:**

```bash
# 1. Start Docker services
cd backend
docker-compose up -d

# 2. Setup backend
python3.10 -m venv .venv
source .venv/bin/activate
pip install uv
uv pip install -e .

# 3. Configure .env file with your OpenAI API key
echo "OPENAI_API_KEY=your_key_here" >> .env

# 4. Run migrations
for file in migrations/postgres/*.sql; do
  psql postgresql://toefl:toefl123@localhost:5432/toefl_speaking -f "$file"
done

# 5. Start backend
uvicorn app.app:app --reload

# 6. In a new terminal, setup frontend
cd ../frontend
npm install
npm run dev
```

Visit http://localhost:5173 to use the application!

## 📁 Project Structure

```
TOFEL-demo/
├── backend/
│   ├── app/
│   │   ├── models/           # Database models
│   │   │   ├── question.py
│   │   │   ├── recording.py
│   │   │   └── analysis.py
│   │   ├── routers/          # API endpoints
│   │   │   ├── questions.py
│   │   │   ├── recordings.py
│   │   │   └── analysis.py
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # Business logic
│   │   │   ├── ai/
│   │   │   │   ├── asr.py   # Speech-to-text
│   │   │   │   └── llm.py   # LLM analysis
│   │   │   ├── storage_service.py
│   │   │   └── analysis_service.py
│   │   ├── config.py         # Settings
│   │   ├── database.py       # DB connection
│   │   └── app.py           # FastAPI app
│   ├── migrations/           # SQL migrations
│   ├── docker-compose.yml    # Docker services
│   └── pyproject.toml        # Dependencies
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   └── App.tsx      # Main component
│   │   ├── hooks/
│   │   │   └── useAudioRecorder.ts
│   │   ├── services/
│   │   │   └── api.ts       # API client
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── SETUP.md                  # Setup instructions
├── README.md                 # This file
└── .gitignore
```

## 🔧 Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
# Database
DATABASE_URL=postgresql+asyncpg://toefl:toefl123@localhost:5432/toefl_speaking

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_SECURE=false

# OpenAI (Required)
OPENAI_API_KEY=sk-...your-key-here
```

### Frontend Environment Variables

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## 📊 Database Schema

### Tables

**questions**
- Question text and metadata
- SOS keywords and starter phrases
- Audio URLs

**recordings**
- User audio recordings
- Links to questions
- Storage URLs

**analysis_results**
- AI-generated feedback (JSON format)
- Status tracking (pending/processing/completed/failed)
- Timestamps

## 🎨 UI Components

### Report UI Features

- **Score Card**: Circular progress indicator with total score and level badge
- **AI Summary**: Gradient card with overall performance summary
- **Sentence Analysis**: Interactive expandable cards showing:
  - Original sentence
  - Native speaker version (if applicable)
  - Grammar feedback
  - Expression feedback
  - Improvement suggestions
- **Actionable Tips**: Numbered list of specific recommendations

## 🧪 Testing

### Backend Testing

```bash
cd backend
source .venv/bin/activate

# Test API endpoints
curl http://localhost:8000/api/v1/questions
curl http://localhost:8000/docs  # Swagger UI
```

### Frontend Testing

```bash
cd frontend
npm run dev
# Open http://localhost:5173 in browser
```

## 🐛 Troubleshooting

See [SETUP.md](./SETUP.md#troubleshooting) for common issues and solutions.

## 🔒 Security Notes

- Never commit `.env` files
- Keep OpenAI API keys secure
- Use environment variables for all secrets
- Enable HTTPS in production
- Implement rate limiting for production

## 📈 Future Enhancements

- [ ] User authentication and profiles
- [ ] Progress tracking over time
- [ ] More question types (integrated, academic discussion)
- [ ] Pronunciation analysis
- [ ] Speaking pace and fluency metrics
- [ ] Comparison with native speaker benchmarks
- [ ] Mobile app support

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

[Your License Here]

## 🙏 Acknowledgments

- OpenAI for Whisper and GPT-4o APIs
- FastAPI framework
- React and Vite communities

## 📞 Support

For questions or issues:
- Open an issue on GitHub
- Check the [SETUP.md](./SETUP.md) guide
- Review API documentation at `/docs` endpoint

---

**Built with ❤️ for TOEFL learners worldwide**

