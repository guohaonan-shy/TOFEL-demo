# TOEFL Speaking Backend

TOEFL 口语练习后端 API，基于 FastAPI + Supabase 构建。

> 📖 完整的项目文档请查看 [根目录 README](../README.md)

## 快速启动

### 1. 确保 Supabase 已启动

```bash
cd ..  # 项目根目录
supabase start
supabase status  # 获取 Storage 密钥
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入 Storage 密钥和 AI API Keys
```

### 3. 安装依赖并启动

```bash
uv sync
uv run uvicorn app.app:app --reload --host 0.0.0.0 --port 8000
```

API 文档: http://localhost:8000/docs

## 项目结构

```
backend/
├── app/
│   ├── app.py              # FastAPI 入口
│   ├── config.py           # 配置管理
│   ├── database.py         # 数据库连接
│   ├── models/             # SQLAlchemy 模型
│   ├── schemas/            # Pydantic 模型
│   ├── routers/            # API 路由
│   └── services/           # 业务逻辑
│       ├── ai/             # AI 服务 (ASR + LLM)
│       ├── analysis_service.py
│       └── storage_service.py  # Supabase Storage
├── .env.example
└── pyproject.toml
```

> 📝 题目音频和种子录音文件已迁移到 `supabase/assets/` 目录

## 环境变量

参考 `.env.example` 配置以下变量：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | Supabase PostgreSQL 连接串 |
| `SUPABASE_URL` | Supabase API URL |
| `STORAGE_ENDPOINT` | Storage S3 端点 |
| `STORAGE_ACCESS_KEY` | Storage 访问密钥 |
| `STORAGE_SECRET_KEY` | Storage 密钥 |
| `OPENAI_API_KEY` | OpenAI API Key (Whisper 必需) |
| `GEMINI_API_KEY` | Gemini API Key (推荐) |
| `AUDIO_AI_PROVIDER` | AI 提供商选择 (auto/gemini/openai) |

## API 端点

### 题目管理
- `GET /api/v1/questions` - 获取题目列表
- `GET /api/v1/questions/{id}` - 获取题目详情

### 录音管理
- `POST /api/v1/recordings` - 上传录音
- `GET /api/v1/recordings/{id}` - 获取录音信息

### AI 分析
- `POST /api/v1/analysis/stream` - 提交分析任务 (SSE)
- `GET /api/v1/analysis/recording/{recording_id}` - 获取分析结果
