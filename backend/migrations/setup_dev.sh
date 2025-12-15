#!/bin/bash
# Development environment setup script
# Usage: ./migrations/setup_dev.sh

set -e

echo "=============================================="
echo "TOEFL Speaking - Development Setup"
echo "=============================================="

cd "$(dirname "$0")/.."

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start containers
echo ""
echo "🐳 Starting Docker containers..."
docker compose up -d

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check PostgreSQL
until docker exec toefl-postgres pg_isready -U toefl > /dev/null 2>&1; do
    echo "  Waiting for PostgreSQL..."
    sleep 2
done
echo "  ✓ PostgreSQL is ready"

# Check MinIO
until curl -s http://localhost:9000/minio/health/live > /dev/null 2>&1; do
    echo "  Waiting for MinIO..."
    sleep 2
done
echo "  ✓ MinIO is ready"

# Run migrations
echo ""
echo "🔄 Running migrations..."
uv run python migrations/migrate.py

echo ""
echo "=============================================="
echo "✅ Development environment is ready!"
echo ""
echo "Services:"
echo "  - PostgreSQL: localhost:5432"
echo "  - MinIO API:  localhost:9000"
echo "  - MinIO Console: http://localhost:9001"
echo ""
echo "Run the API server:"
echo "  uv run uvicorn main:app --reload"
echo "=============================================="
