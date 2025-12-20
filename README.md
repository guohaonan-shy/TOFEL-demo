# TOEFL Speaking Practice Application

AI驱动的托福口语练习平台，提供基于内容分块的智能反馈和发音分析。

![TOEFL Speaking Practice](https://img.shields.io/badge/TOEFL-Speaking%20Practice-blue)
![Python](https://img.shields.io/badge/Python-3.10%2B-green)
![FastAPI](https://img.shields.io/badge/FastAPI-0.124%2B-teal)
![React](https://img.shields.io/badge/React-18-blue)

## ✨ 核心功能

- 🎤 **浏览器录音** - 45秒录音，支持暂停/恢复
- 🤖 **智能分析** - OpenAI Whisper转录 + AI音频分析（支持 Gemini / GPT-4o）
- 📊 **逐段反馈** - 自动识别开头语和观点，提供针对性建议
- 🔊 **音频分块播放** - 每段内容独立音频，可单独播放
- 📈 **ETS评分** - 基于Delivery、Language Use、Topic Development三维度评分(0-30分)
- 🔄 **灵活切换** - 支持 Gemini/OpenAI 自由切换，自动降级保障

## 🚀 快速启动

### 前置要求

- **Python 3.10+**
  ```bash
  # 检查 Python 版本
  python3 --version
  
  # ⚠️ 如果版本低于 3.10，需使用指定版本
  # macOS/Linux: python3.10 或 python3.11 或 python3.12
  ```
- **Node.js 18+**
- **Docker & Docker Compose**
- **OpenAI API Key** (必需，用于 Whisper 转录)
  - 获取地址: https://platform.openai.com/api-keys
- **Gemini API Key** (可选，用于音频分析，推荐)
  - 获取地址: https://ai.google.dev/
- **ffmpeg** (用于音频处理)

### 1. 启动 Docker 服务

```bash
cd backend
docker-compose up -d

# 验证服务运行
docker ps
# 应该看到: toefl-postgres, toefl-minio
```

### 2. 安装 ffmpeg

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# 验证安装
ffmpeg -version
```

### 3. 配置后端

#### 方式一：手动配置（推荐新用户）

```bash
cd backend

# 创建虚拟环境（使用 Python 3.10+）
python3 -m venv .venv
# 如果默认 Python 版本 < 3.10，使用：python3.10 -m venv .venv
source .venv/bin/activate

# 安装依赖
pip install uv
uv pip install -e .

# 配置环境变量
cp .env.example .env
# 然后编辑 .env 文件，填入你的 API Keys
```

**⚠️ 重要：编辑 `.env` 文件**

打开 `backend/.env`，**必须**替换以下占位符：
- `OPENAI_API_KEY`: 填入你的真实 OpenAI API key（必需）
- `GEMINI_API_KEY`: 填入你的 Gemini API key（可选，推荐）

不替换 API key 会导致 AI 功能无法使用（401 错误）。

#### 方式二：一键初始化（自动化脚本）

```bash
cd backend

# 运行初始化脚本（会自动创建虚拟环境和运行迁移）
./migrations/setup_dev.sh
```

⚠️ **注意**：此脚本会自动管理虚拟环境。如果 `.venv` 已存在会被删除重建。

### 4. 运行数据库迁移

```bash
cd backend

# 如果使用方式一手动配置，需要运行迁移
./migrations/setup_dev.sh
# 或者直接运行迁移（不重建虚拟环境）
source .venv/bin/activate
uv run python migrations/migrate.py
```

### 5. 启动后端

```bash
cd backend
source .venv/bin/activate
python main.py

# 后端运行在: http://localhost:8000
# API 文档: http://localhost:8000/docs
```

**其他启动方式**：
```bash
# 使用 uvicorn 直接启动（无需激活虚拟环境）
uv run uvicorn app.app:app --reload --host 0.0.0.0 --port 8000
```

### 6. 启动前端

```bash
# 打开新终端
cd frontend

# 安装依赖（首次运行）
npm install

# 启动开发服务器
npm run dev

# 前端运行在: http://localhost:5173
```

> 💡 **提示**：前端默认连接 `http://localhost:8000/api/v1`  
> 如需修改 API 地址，创建 `frontend/.env` 并设置 `VITE_API_BASE_URL`

### 7. 访问应用

打开浏览器访问: **http://localhost:5173**

## 🔍 验证安装

完成上述步骤后，运行以下检查确保环境正确配置：

```bash
# 1. 检查 Docker 容器
docker ps
# 应该看到: toefl-postgres 和 toefl-minio

# 2. 检查后端 API
curl http://localhost:8000/api/v1/questions
# 应该返回题目列表的 JSON

# 3. 检查前端和 API 文档
# 浏览器访问:
# - http://localhost:5173 (前端应用)
# - http://localhost:8000/docs (API 文档)
```

✅ 如果以上检查都通过，恭喜！环境配置成功

## 📊 V2 版本新特性

### 内容感知分块分析
- ✅ **智能分块**: LLM自动识别开头语、观点1、观点2
- ✅ **音频分段**: 每个段落独立音频文件，可单独播放
- ✅ **并行处理**: Whisper + AI音频分析同时运行，更快
- ✅ **Python计算评分**: 确保总分和等级计算准确
- ✅ **多AI支持**: Gemini/OpenAI 灵活切换，自动降级

### 分析流程（优化版）
```
1. 上传转换 → 浏览器录音(WebM/MP4)转换为MP3存储
2. Whisper转录 → 获取文本和时间戳（OpenAI）
3. LLM内容分块 → 识别2-4个语义段落（OpenAI GPT-4o）
4. pydub音频切分 → 从MP3创建可播放的音频段
5. 并行音频分析 → 全局+各段落同时分析（Gemini 2.5 Pro / GPT-4o）
   ├─ Gemini: 音频 → 直接输出JSON结构（1次调用）⚡️
   └─ OpenAI: 音频 → 文本 → JSON解析（2次调用）
6. Python计算评分 → total_score和level
7. 前端展示 → 逐段分析+音频播放
```

## 🏗️ 技术架构

**后端:**
- FastAPI + SQLAlchemy (异步ORM)
- PostgreSQL (数据库)
- MinIO (对象存储 - 所有音频存储为MP3格式)
- OpenAI Whisper (语音转录)
- **Google Gemini 2.5 Pro** (AI音频分析 - 推荐) ⭐️
- GPT-4o Audio Preview (AI音频分析 - 降级选项)
- pydub + ffmpeg (音频处理 - 上传时转换为MP3)

**前端:**
- React 18 + TypeScript
- Vite (构建工具)
- Tailwind CSS
- Lucide React (图标)

## 📁 项目结构

```
TOFEL-demo/
├── backend/
│   ├── app/
│   │   ├── services/ai/
│   │   │   ├── asr.py          # Whisper转录 + 音频切分
│   │   │   └── llm.py          # Gemini/GPT-4o AI分析（统一接口）
│   │   ├── services/
│   │   │   ├── analysis_service.py  # 主工作流编排
│   │   │   └── storage_service.py   # MinIO操作
│   │   └── routers/            # API端点
│   ├── migrations/             # 数据库迁移
│   └── docker-compose.yml      # PostgreSQL + MinIO
│
├── frontend/
│   └── src/
│       ├── app/App.tsx         # 主组件
│       └── services/api.ts     # API客户端
│
└── README.md
```

## 🔧 配置说明

### 后端环境变量 (`backend/.env`)

```env
# AI 服务配置
OPENAI_API_KEY=sk-xxxxx              # OpenAI (用于 Whisper 转录，必需)
GEMINI_API_KEY=your-gemini-key       # Google Gemini (音频分析，推荐)
AUDIO_AI_PROVIDER=auto               # auto | gemini | openai

# 数据库
DATABASE_URL=postgresql+asyncpg://toefl:toefl123@localhost:5432/toefl_speaking

# MinIO对象存储
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_SECURE=false
```

### AI 提供商选择策略

**`AUDIO_AI_PROVIDER=auto` (推荐)**
- 如果配置了 `GEMINI_API_KEY` → 优先使用 Gemini
- 否则使用 OpenAI GPT-4o
- Gemini 失败时自动降级到 OpenAI

**`AUDIO_AI_PROVIDER=gemini` (强制)**
- 强制使用 Gemini 2.5 Pro
- 失败时如果有 OpenAI key 会降级

**`AUDIO_AI_PROVIDER=openai` (强制)**
- 强制使用 OpenAI GPT-4o Audio

**性能对比:**
| 提供商 | 速度 | 成本 | 质量 |
|--------|------|------|------|
| Gemini 2.5 Pro | ⚡️ 更快 | 💰 更低 | ✅ 优秀 |
| GPT-4o Audio | 🐢 较慢 | 💰💰 较高 | ✅ 优秀 |

### 前端环境变量 (`frontend/.env`)

前端有默认配置，本地开发**不需要**创建 `.env` 文件。

如需自定义 API 地址，可创建 `frontend/.env`：
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## 🐛 常见问题

### Python 版本问题

**问题**: 依赖安装失败，提示 Python 版本不满足要求
```bash
# 检查 Python 版本
python3 --version

# 如果 < 3.10，使用特定版本创建虚拟环境
cd backend
rm -rf .venv
python3.10 -m venv .venv  # 或 python3.11, python3.12
source .venv/bin/activate
pip install uv
uv pip install -e .
```

### API Key 配置问题

**问题**: 401 错误 "Incorrect API key provided"
- 检查 `backend/.env` 文件
- 确保 `OPENAI_API_KEY` 已替换为真实的 API key
- 不要使用占位符 `sk-your-openai-key-here`
- 修改后需要重启后端服务

### 后端启动失败

**问题**: `ModuleNotFoundError: No module named 'uvicorn'`
```bash
# 确保虚拟环境已激活
source .venv/bin/activate
# 重新安装依赖
uv pip install -e .
```

**问题**: `Address already in use` (端口 8000 被占用)
```bash
# 查找并停止占用端口的进程
lsof -ti:8000 | xargs kill -9
# 然后重新启动后端
```

**问题**: 后端反复重启
```bash
# 方案1: 使用更新后的 main.py (已设置 reload_dirs)
python main.py

# 方案2: 禁用自动重载
uvicorn app.app:app --host 0.0.0.0 --port 8000
```

**问题**: `pydub` 错误或 "Decoding failed"
```bash
# 确保 ffmpeg 已安装
ffmpeg -version
# 如未安装: brew install ffmpeg (macOS)
```

### 前端启动失败

```bash
# 清除缓存重新安装
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Docker 服务问题

```bash
# 重启服务
docker-compose down
docker-compose up -d

# 查看日志
docker-compose logs
```

### 分析失败

**错误**: "Invalid mp3 format"
- 后端已自动处理 webm → mp3 转换
- 确保 ffmpeg 已正确安装

**错误**: "Chunking failed"
- 检查录音时长（至少10秒）
- 查看后端日志获取详细错误信息

### Gemini 相关问题

**问题**: Gemini 配额超限 (429 RESOURCE_EXHAUSTED)
```bash
# 解决方案1: 切换到 OpenAI（系统会自动降级）
AUDIO_AI_PROVIDER=openai

# 解决方案2: 使用更高配额的 Gemini 模型
# 修改 llm.py 中的模型名称: gemini-2.0-flash-exp → gemini-1.5-flash

# 解决方案3: 等待配额重置（免费层每日配额）
```

**问题**: Gemini 返回英文反馈
- 已修复：更新后的 prompt 强制要求中文输出
- 重启后端服务器生效

**问题**: 如何获取 Gemini API Key？
- 访问: https://ai.google.dev/
- 登录 Google 账号
- 创建 API Key（免费层有配额限制）
- 复制到 `.env` 文件中的 `GEMINI_API_KEY`

## 📊 JSON 输出格式

```json
{
  "analysis_version": "2.0",
  "global_evaluation": {
    "total_score": 24,
    "score_breakdown": {
      "delivery": 8,
      "language_use": 8,
      "topic_development": 8
    },
    "level": "Good",
    "overall_summary": "整体表现良好...",
    "detailed_feedback": "详细分析..."
  },
  "full_transcript": {
    "text": "完整转录文本...",
    "segments": [{"start": 0.0, "end": 2.5, "text": "..."}]
  },
  "chunks": [
    {
      "chunk_id": 0,
      "chunk_type": "opening_statement",
      "time_range": [0.0, 6.7],
      "text": "Honestly, I think...",
      "audio_url": "https://...",
      "feedback": "markdown格式的综合反馈"
    }
  ]
}
```

## 🎯 使用流程

1. 打开 http://localhost:5173
2. 选择托福口语题目
3. 准备15秒 → 录音45秒
4. 提交AI分析（需要20-40秒）
5. 查看报告：
   - 总分和等级
   - 整体评价
   - 逐段分析（2-4段）
   - 点击音量图标播放该段音频
   - 展开查看详细反馈

## 🔗 有用链接

- 后端API文档: http://localhost:8000/docs
- MinIO控制台: http://localhost:9001 (minioadmin / minioadmin123)
- PostgreSQL: localhost:5432 (toefl / toefl123)

## 📝 开发注意事项

- `.env` 文件不要提交到 Git
- API Keys（OpenAI、Gemini）保密
- 录音文件存储在 MinIO `toefl-recordings` bucket (统一为MP3格式)
- 浏览器录音(WebM/MP4)在上传时自动转换为MP3
- 音频分块存储在 `chunks/{recording_id}/` 路径 (MP3格式)
- 评分逻辑: ≥24=Excellent, ≥18=Good, ≥14=Fair, <14=Weak
- **Gemini 优先**: 使用 `AUDIO_AI_PROVIDER=auto` 自动选择最优方案
- **降级机制**: Gemini 失败会自动切换到 OpenAI，保障服务可用性

## 📈 未来增强

### 功能扩展
- [ ] 用户认证和个人档案
- [ ] 历史进度追踪
- [ ] 更多题型（综合口语、学术讨论）
- [ ] 发音对比训练
- [ ] 移动端支持

### AI 优化
- [x] Gemini 音频分析集成（v2.1）
- [x] 自动降级机制（v2.1）
- [x] 中文反馈优化（v2.1）
- [ ] Gemini 转录支持（替代 Whisper）
- [ ] 智能重试策略
- [ ] 音频文件缓存（避免重复上传）
- [ ] 成本和性能监控

---

**Version**: 2.1 (Gemini Integration)  
**Last Updated**: December 18, 2024  
**Built with ❤️ for TOEFL learners worldwide**

### 🎉 新版本亮点 (v2.1)
- ⚡️ **Gemini 2.5 Pro 集成**: 更快的音频分析，更低的成本
- 🔄 **智能降级**: Gemini 失败自动切换到 OpenAI，保障服务稳定
- 🌏 **中文优化**: 强化 prompt，确保所有反馈都是中文
- 🎯 **一键切换**: 通过配置灵活选择 AI 提供商
