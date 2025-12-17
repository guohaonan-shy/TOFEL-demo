# TOEFL Speaking Practice Application

AI驱动的托福口语练习平台，提供基于内容分块的智能反馈和发音分析。

![TOEFL Speaking Practice](https://img.shields.io/badge/TOEFL-Speaking%20Practice-blue)
![Python](https://img.shields.io/badge/Python-3.10%2B-green)
![FastAPI](https://img.shields.io/badge/FastAPI-0.124%2B-teal)
![React](https://img.shields.io/badge/React-18-blue)

## ✨ 核心功能

- 🎤 **浏览器录音** - 45秒录音，支持暂停/恢复
- 🤖 **智能分析** - OpenAI Whisper转录 + GPT-4o音频分析
- 📊 **逐段反馈** - 自动识别开头语和观点，提供针对性建议
- 🔊 **音频分块播放** - 每段内容独立音频，可单独播放
- 📈 **ETS评分** - 基于Delivery、Language Use、Topic Development三维度评分(0-30分)

## 🚀 快速启动

### 前置要求

- Python 3.10+ 
- Node.js 18+
- Docker & Docker Compose
- OpenAI API Key
- ffmpeg (用于音频处理)

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

```bash
cd backend

# 创建虚拟环境
python3 -m venv .venv
source .venv/bin/activate

# 安装依赖
pip install uv
uv pip install -e .

# 配置环境变量
cat > .env << EOF
DATABASE_URL=postgresql+asyncpg://toefl:toefl123@localhost:5432/toefl_speaking
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_SECURE=false
OPENAI_API_KEY=sk-your-key-here
EOF
```

### 4. 启动后端

```bash
# 在 backend/ 目录下，虚拟环境已激活
python main.py

# 后端运行在: http://localhost:8000
# API 文档: http://localhost:8000/docs
```

### 5. 启动前端

```bash
# 打开新终端
cd frontend

# 安装依赖（首次运行）
npm install

# 启动开发服务器
npm run dev

# 前端运行在: http://localhost:5173
```

### 6. 访问应用

打开浏览器访问: **http://localhost:5173**

## 📊 V2 版本新特性

### 内容感知分块分析
- ✅ **智能分块**: LLM自动识别开头语、观点1、观点2
- ✅ **音频分段**: 每个段落独立音频文件，可单独播放
- ✅ **并行处理**: Whisper + GPT-4o音频同时运行，更快
- ✅ **Python计算评分**: 确保总分和等级计算准确

### 分析流程
```
1. Whisper转录 → 获取文本和时间戳
2. LLM内容分块 → 识别2-4个语义段落
3. pydub音频切分 → 创建可播放的音频段
4. 并行音频分析 → 全局+各段落同时分析
5. Python计算评分 → total_score和level
6. 前端展示 → 逐段分析+音频播放
```

## 🏗️ 技术架构

**后端:**
- FastAPI + SQLAlchemy (异步ORM)
- PostgreSQL (数据库)
- MinIO (对象存储)
- OpenAI Whisper (转录)
- GPT-4o Audio Preview (发音分析)
- pydub + ffmpeg (音频处理)

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
│   │   │   ├── asr.py          # Whisper + 音频切分
│   │   │   └── llm.py          # GPT-4o分析
│   │   ├── services/
│   │   │   ├── analysis_service.py  # 主工作流
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
# OpenAI API (必需)
OPENAI_API_KEY=sk-xxxxx

# 数据库
DATABASE_URL=postgresql+asyncpg://toefl:toefl123@localhost:5432/toefl_speaking

# MinIO对象存储
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_SECURE=false
```

### 前端环境变量 (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## 🐛 常见问题

### 后端启动失败

**问题**: `ModuleNotFoundError: No module named 'uvicorn'`
```bash
# 确保虚拟环境已激活
source .venv/bin/activate
# 重新安装依赖
uv pip install -e .
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
- OpenAI API Key 保密
- 录音文件存储在 MinIO `toefl-recordings` bucket
- 音频分块存储在 `chunks/{recording_id}/` 路径
- 评分逻辑: ≥24=Excellent, ≥18=Good, ≥14=Fair, <14=Weak

## 📈 未来增强

- [ ] 用户认证和个人档案
- [ ] 历史进度追踪
- [ ] 更多题型（综合口语、学术讨论）
- [ ] 发音对比训练
- [ ] 移动端支持

---

**Version**: 2.0 (Content-Aware Chunking)  
**Last Updated**: December 17, 2024  
**Built with ❤️ for TOEFL learners worldwide**
