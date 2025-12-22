# TOEFL Speaking Practice Application

AI驱动的托福口语练习平台，提供基于内容分块的智能反馈和发音分析。

![TOEFL Speaking Practice](https://img.shields.io/badge/TOEFL-Speaking%20Practice-blue)
![Python](https://img.shields.io/badge/Python-3.10%2B-green)
![FastAPI](https://img.shields.io/badge/FastAPI-0.124%2B-teal)
![React](https://img.shields.io/badge/React-18-blue)
![Supabase](https://img.shields.io/badge/Supabase-Local%20%2B%20Cloud-3ECF8E)

## ✨ 核心功能

- 🎤 **浏览器录音** - 45秒录音，支持暂停/恢复
- 🤖 **智能分析** - OpenAI Whisper转录 + AI音频分析（支持 Gemini / GPT-4o）
- 📊 **逐段反馈** - 自动识别开头语和观点，提供针对性建议
- 🔊 **音频分块播放** - 每段内容独立音频，可单独播放
- 📈 **ETS评分** - 基于Delivery、Language Use、Topic Development三维度评分(0-30分)
- 🔄 **灵活切换** - 支持 Gemini/OpenAI 自由切换，自动降级保障

## 🏗️ 技术架构

**基础设施 (Supabase):**
- PostgreSQL (数据库)
- Supabase Storage (对象存储 - S3 兼容)
- Supabase Studio (统一管理界面)

**后端:**
- FastAPI + SQLAlchemy (异步ORM)
- OpenAI Whisper (语音转录)
- Google Gemini 2.5 Pro (AI音频分析 - 推荐) ⭐️
- GPT-4o Audio Preview (AI音频分析 - 降级选项)
- pydub + ffmpeg (音频处理)

**前端:**
- React 18 + TypeScript
- Vite (构建工具)
- Tailwind CSS
- Lucide React (图标)

## 🚀 快速启动

### 前置要求

- **Python 3.10+** 和 **uv** (Python 包管理器)
- **Node.js 18+**
- **Docker Desktop** (用于运行 Supabase 本地环境)
- **Supabase CLI** - [安装指南](https://supabase.com/docs/guides/cli)
- **ffmpeg** (音频处理)
- **API Keys:**
  - OpenAI API Key (必需，用于 Whisper 转录) - https://platform.openai.com/api-keys
  - Gemini API Key (推荐，用于音频分析) - https://ai.google.dev/

### 安装 Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# 或使用 npm
npm install -g supabase

# 验证安装
supabase --version
```

### 安装 ffmpeg

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# 验证安装
ffmpeg -version
```

---

## 📦 新成员快速开始

### Step 1: 克隆项目

```bash
git clone <repo-url>
cd TOFEL-demo
```

### Step 2: 启动 Supabase 本地环境

```bash
# 在项目根目录
supabase start
```

首次运行需要下载 Docker 镜像，可能需要几分钟。启动成功后会显示：

```
Started supabase local development setup.

         API URL: http://127.0.0.1:54321
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323     ← 管理界面
        ...
```

### Step 3: 获取 Storage 密钥

```bash
supabase status
```

找到 **Storage (S3)** 部分，复制 `Access Key` 和 `Secret Key`。

### Step 4: 配置后端环境变量

```bash
cd backend

# 复制配置模板
cp .env.example .env

# 编辑 .env 文件
```

填入以下内容：

```env
# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres

# Supabase
SUPABASE_URL=http://127.0.0.1:54321

# Storage (从 supabase status 复制)
STORAGE_ENDPOINT=http://127.0.0.1:54321/storage/v1/s3
STORAGE_ACCESS_KEY=<your-access-key>
STORAGE_SECRET_KEY=<your-secret-key>
STORAGE_REGION=local

# AI Services (必须填写真实的 API Key)
OPENAI_API_KEY=sk-xxxxx
GEMINI_API_KEY=xxxxx
AUDIO_AI_PROVIDER=auto
```

### Step 5: 初始化 Storage

```bash
cd supabase

# 设置环境变量 (从 supabase status 获取)
export STORAGE_ACCESS_KEY="<your-access-key>"
export STORAGE_SECRET_KEY="<your-secret-key>"

# 安装 boto3 (如果还没有)
pip install boto3

# 运行初始化脚本（创建 buckets + 上传音频）
python init_storage.py
```

这会：
- 创建 `toefl-questions` 和 `toefl-recordings` buckets
- 上传题目音频 (`assets/questions/`)
- 上传种子录音 (`assets/recordings/`)

### Step 6: 安装后端依赖并启动

```bash
cd ../backend

# 安装依赖
uv sync

# 启动后端服务
uv run uvicorn app.app:app --reload --host 0.0.0.0 --port 8000
```

后端运行在: http://localhost:8000  
API 文档: http://localhost:8000/docs

### Step 7: 启动前端

```bash
# 打开新终端
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端运行在: http://localhost:5173

### Step 8: 验证安装

1. ✅ **Supabase Studio**: http://127.0.0.1:54323
   - **Table Editor**: 应该能看到 `questions`, `recordings`, `analysis_results` 表
   - **Storage**: 应该能看到 `toefl-questions`, `toefl-recordings` buckets
   - **Authentication → Users**: 应该能看到 `localtest@gmail.com` 用户

2. ✅ **后端 API**: http://localhost:8000/docs
   - 测试 `GET /api/v1/questions` 应该返回题目列表

3. ✅ **前端应用**: http://localhost:5173
   - 使用 `localtest@gmail.com` / `123456` 登录
   - 能看到题目详情页面

---

## 🔄 日常开发流程

### 启动服务

```bash
# 终端 1: 启动 Supabase
supabase start

# 终端 2: 启动后端
cd backend
uv run uvicorn app.app:app --reload --host 0.0.0.0 --port 8000

# 终端 3: 启动前端
cd frontend
npm run dev
```

### 同步其他成员的数据库变更

当其他成员提交了数据库 schema 变更或 seed 数据更新时：

```bash
# 1. 拉取最新代码
git pull

# 2. 重置数据库（应用所有迁移 + 导入 seed 数据）
supabase db reset

# 3. 重新初始化 Storage（上传音频文件）
cd supabase
export STORAGE_ACCESS_KEY="<your-access-key>"
export STORAGE_SECRET_KEY="<your-secret-key>"
python init_storage.py
```

> 💡 **提示**：
> - `supabase db reset` 会清空所有数据并重新应用 `migrations/` 和 `seed.sql`
> - Storage 密钥可从 `supabase status` 的 **Storage (S3)** 部分获取
> - seed.sql 已包含测试用户和示例分析报告

### 测试账号

重置后会自动创建测试账号：

| 字段 | 值 |
|------|-----|
| Email | `localtest@gmail.com` |
| Password | `123456` |
| User ID | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |

### 停止服务

```bash
supabase stop
```

---

## 📁 项目结构

```
TOFEL-demo/
├── backend/
│   ├── app/
│   │   ├── services/
│   │   │   ├── ai/
│   │   │   │   ├── asr.py              # Whisper转录 + 音频切分
│   │   │   │   └── llm.py              # Gemini/GPT-4o AI分析
│   │   │   ├── analysis_service.py     # 主工作流编排
│   │   │   └── storage_service.py      # Supabase Storage 操作
│   │   ├── routers/                    # API端点
│   │   ├── models/                     # SQLAlchemy 模型
│   │   └── schemas/                    # Pydantic 模型
│   ├── .env.example
│   └── pyproject.toml
│
├── frontend/
│   └── src/
│       ├── app/App.tsx                 # 主组件
│       └── services/api.ts             # API客户端
│
├── supabase/
│   ├── config.toml                     # Supabase 本地配置
│   ├── assets/                         # 静态资源文件
│   │   ├── questions/                  # 题目音频 (question_{id}.mp3)
│   │   └── recordings/                 # 种子录音 (recording_{id}.mp3)
│   ├── migrations/                     # 数据库迁移
│   │   ├── 20251221000001_init_schema.sql
│   │   └── 20251222000001_add_user_id_to_recordings.sql
│   ├── seed.sql                        # 种子数据 (用户、题目、录音、分析报告)
│   └── init_storage.py                 # Storage 初始化脚本
│
└── README.md
```

---

## 🔧 配置说明

### 后端环境变量 (`backend/.env`)

```env
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres

# Supabase API
SUPABASE_URL=http://127.0.0.1:54321

# Storage (S3 兼容)
STORAGE_ENDPOINT=http://127.0.0.1:54321/storage/v1/s3
STORAGE_ACCESS_KEY=xxx
STORAGE_SECRET_KEY=xxx
STORAGE_REGION=local

# Storage Buckets
STORAGE_BUCKET_QUESTIONS=toefl-questions
STORAGE_BUCKET_RECORDINGS=toefl-recordings

# AI 服务
OPENAI_API_KEY=sk-xxxxx              # OpenAI (Whisper 转录，必需)
GEMINI_API_KEY=xxxxx                 # Google Gemini (音频分析，推荐)
AUDIO_AI_PROVIDER=auto               # auto | gemini | openai
```

### AI 提供商选择策略

| 配置 | 行为 |
|------|------|
| `auto` (推荐) | 优先 Gemini，失败时降级到 OpenAI |
| `gemini` | 强制使用 Gemini |
| `openai` | 强制使用 OpenAI GPT-4o |

### 性能对比

| 提供商 | 速度 | 成本 | 质量 |
|--------|------|------|------|
| Gemini 2.5 Pro | ⚡️ 更快 | 💰 更低 | ✅ 优秀 |
| GPT-4o Audio | 🐢 较慢 | 💰💰 较高 | ✅ 优秀 |

---

## 🐛 常见问题

### Supabase 启动失败

```bash
# 确保 Docker Desktop 正在运行
docker info

# 重新启动 Supabase
supabase stop
supabase start
```

### Storage 访问失败 (NoSuchBucket)

```bash
# 运行初始化脚本创建 buckets
cd supabase
export STORAGE_ACCESS_KEY="xxx"
export STORAGE_SECRET_KEY="xxx"
python init_storage.py
```

### API Key 配置问题

- 检查 `backend/.env` 文件
- 确保 `OPENAI_API_KEY` 是真实的 key，不是占位符
- 修改后需要重启后端服务

### 后端依赖问题

```bash
cd backend
uv sync  # 重新安装依赖
```

### 前端启动失败

```bash
cd frontend
rm -rf node_modules
npm install
npm run dev
```

---

## 🔗 有用链接

| 服务 | 地址 |
|------|------|
| 前端应用 | http://localhost:5173 |
| 后端 API 文档 | http://localhost:8000/docs |
| Supabase Studio | http://127.0.0.1:54323 |

---

## 📝 开发注意事项

- `.env` 文件不要提交到 Git
- API Keys 保密
- 数据库变更通过 `supabase/migrations/` 管理
- 使用 `supabase db reset` 同步其他成员的数据库变更
- 评分逻辑: ≥24=Excellent, ≥18=Good, ≥14=Fair, <14=Weak

---

## 🚀 部署到生产环境

1. 在 [Supabase Dashboard](https://supabase.com/dashboard) 创建项目
2. 链接项目: `supabase link --project-ref <your-project-ref>`
3. 推送迁移: `supabase db push`
4. 配置生产环境的 `.env` 文件（使用云端 URL 和 Keys）
5. 部署后端和前端应用

---

**Version**: 3.1 (User Authentication + Data Ownership)  
**Last Updated**: December 23, 2024  
**Built with ❤️ for TOEFL learners worldwide**
