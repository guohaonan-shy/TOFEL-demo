# TOEFL Speaking Backend

TOEFL 口语练习后端 API，基于 FastAPI 构建。

## 技术栈

- **框架**: FastAPI
- **数据库**: PostgreSQL + SQLAlchemy 2.0
- **对象存储**: MinIO (S3 兼容)
- **AI 服务**: 火山引擎豆包 (ASR + LLM)
- **包管理**: uv

## 快速开始

### 方式一：一键初始化（推荐）

```bash
# 首次设置或重置开发环境
./migrations/setup_dev.sh
```

### 方式二：手动初始化

#### 1. 启动基础设施

```bash
docker compose up -d
```

服务地址:
- MinIO Console: http://localhost:9001 (minioadmin / minioadmin123)
- PostgreSQL: localhost:5432

#### 2. 运行迁移

```bash
# 运行所有待执行的迁移
uv run python migrations/migrate.py

# 查看迁移状态
uv run python migrations/migrate.py --status

# 重置数据库并重新运行迁移（危险！会删除所有数据）
uv run python migrations/migrate.py --fresh
```

#### 3. 启动后端服务

```bash
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API 文档: http://localhost:8000/docs

## 迁移系统

项目使用自定义迁移系统管理数据库 schema 和 MinIO 资源，支持团队协作开发。

### 目录结构

```
migrations/
├── postgres/           # PostgreSQL 迁移文件 (SQL)
│   ├── 001_init_schema.sql
│   └── 002_seed_questions.sql
└── minio/              # MinIO 迁移文件 (Python)
    ├── 001_init_buckets.py
    └── 002_upload_question_audio.py
```

### 添加新迁移

#### PostgreSQL 迁移

创建新文件 `migrations/postgres/003_your_migration.sql`:

```sql
-- Migration: 003_your_migration
-- Description: Your description here
-- Created: 2025-01-01

ALTER TABLE questions ADD COLUMN new_field VARCHAR(100);
```

#### MinIO 迁移

创建新文件 `migrations/minio/003_your_migration.py`:

```python
"""
Migration: 003_your_migration
Description: Your description here
Created: 2025-01-01
"""

def up(client, settings):
    """Apply migration."""
    # Your migration code here
    pass

def down(client, settings):
    """Rollback migration (optional)."""
    pass
```

### 命名规范

- 使用三位数字前缀：`001_`, `002_`, `003_`
- 使用下划线分隔的小写名称
- 描述应简洁明了

## API 端点

### 题目管理
- `GET /api/v1/questions` - 获取题目列表
- `GET /api/v1/questions/{id}` - 获取题目详情（包含音频URL和SOS提示）
- `POST /api/v1/questions` - 创建题目

### 录音管理
- `POST /api/v1/recordings` - 上传录音
- `GET /api/v1/recordings/{id}` - 获取录音信息
- `GET /api/v1/recordings/{id}/audio` - 获取录音音频 URL

### AI 分析
- `POST /api/v1/analysis` - 提交分析任务
- `GET /api/v1/analysis/{task_id}` - 获取分析结果
- `GET /api/v1/analysis/recording/{recording_id}` - 按录音ID获取分析结果

## 项目结构

```
backend/
├── app/
│   ├── app.py               # FastAPI 入口
│   ├── config.py            # 配置管理
│   ├── database.py          # 数据库连接
│   ├── models/              # SQLAlchemy 模型
│   ├── schemas/             # Pydantic 模型
│   ├── routers/             # API 路由
│   └── services/            # 业务逻辑
│       └── ai/              # AI 服务
├── migrations/              # 迁移系统
│   ├── postgres/            # PostgreSQL 迁移 (SQL)
│   ├── minio/               # MinIO 迁移 (Python)
│   ├── audio/               # 初始化音频资源
│   ├── migrate.py           # 迁移运行器
│   └── setup_dev.sh         # 开发环境初始化
├── data/                    # 本地数据存储（gitignore）
│   ├── postgres/            # PostgreSQL 数据
│   └── minio/               # MinIO 数据
├── docker-compose.yml       # 基础设施
└── pyproject.toml           # 项目配置
```

## 配置说明

环境变量配置在 `.env` 文件中：

```env
# 数据库
DATABASE_URL=postgresql+asyncpg://toefl:toefl123@localhost:5432/toefl_speaking

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123

# 火山引擎 (需要填写)
VOLCENGINE_API_KEY=your_api_key
```

## 团队开发指南

### 新成员加入

1. 克隆仓库
2. 复制环境变量配置：
   ```bash
   cp .env.example .env
   ```
3. 根据需要修改 `.env` 中的配置（如 AI 服务密钥）
4. 运行初始化脚本：
   ```bash
   ./migrations/setup_dev.sh
   ```
5. 启动开发服务器：
   ```bash
   uv run uvicorn main:app --reload
   ```

### 添加数据库变更

1. 创建新的迁移文件
2. 本地测试迁移
3. 提交代码到版本控制
4. 其他成员拉取后运行 `uv run python migrations/migrate.py`
