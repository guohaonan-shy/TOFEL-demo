#!/usr/bin/env python3
"""
Database and MinIO migration runner.

Usage:
    python migrations/migrate.py              # Run all pending migrations
    python migrations/migrate.py --status     # Show migration status
    python migrations/migrate.py --fresh      # Reset and run all migrations (DESTRUCTIVE!)
"""

import argparse
import asyncio
import importlib.util
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncpg
from minio import Minio

from app.config import settings


MIGRATIONS_DIR = Path(__file__).parent


async def get_db_connection():
    """Get database connection."""
    # Parse DATABASE_URL to get connection params
    url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "")
    user_pass, host_db = url.split("@")
    user, password = user_pass.split(":")
    host_port, db = host_db.split("/")
    host, port = host_port.split(":")
    
    return await asyncpg.connect(
        user=user,
        password=password,
        database=db,
        host=host,
        port=int(port)
    )


def get_minio_client():
    """Get MinIO client."""
    return Minio(
        endpoint=settings.MINIO_ENDPOINT,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=settings.MINIO_SECURE
    )


async def ensure_migrations_table(conn):
    """Ensure _migrations table exists."""
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS _migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            type VARCHAR(20) NOT NULL,
            applied_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    """)


async def get_applied_migrations(conn, migration_type: str) -> set:
    """Get set of applied migration names."""
    rows = await conn.fetch(
        "SELECT name FROM _migrations WHERE type = $1",
        migration_type
    )
    return {row["name"] for row in rows}


async def record_migration(conn, name: str, migration_type: str):
    """Record that a migration was applied."""
    await conn.execute(
        "INSERT INTO _migrations (name, type) VALUES ($1, $2)",
        name, migration_type
    )


def get_migration_files(migration_type: str) -> list[Path]:
    """Get sorted list of migration files."""
    migration_dir = MIGRATIONS_DIR / migration_type
    
    if migration_type == "postgres":
        files = sorted(migration_dir.glob("*.sql"))
    else:  # minio
        files = sorted(migration_dir.glob("*.py"))
    
    return files


async def run_postgres_migration(conn, file_path: Path) -> bool:
    """Run a PostgreSQL migration file."""
    sql = file_path.read_text()
    try:
        await conn.execute(sql)
        return True
    except Exception as e:
        print(f"    ✗ Error: {e}")
        return False


def run_minio_migration(client, file_path: Path) -> bool:
    """Run a MinIO migration file."""
    spec = importlib.util.spec_from_file_location("migration", file_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    
    try:
        module.up(client, settings)
        return True
    except Exception as e:
        print(f"    ✗ Error: {e}")
        return False


async def run_migrations(fresh: bool = False):
    """Run all pending migrations."""
    print("=" * 60)
    print("TOEFL Speaking - Migration Runner")
    print("=" * 60)
    
    # Connect to services
    print("\n📦 Connecting to services...")
    conn = await get_db_connection()
    minio_client = get_minio_client()
    
    try:
        # Fresh mode: drop all tables first
        if fresh:
            print("\n⚠️  FRESH MODE: Dropping all tables...")
            await conn.execute("DROP TABLE IF EXISTS analysis_results CASCADE")
            await conn.execute("DROP TABLE IF EXISTS recordings CASCADE")
            await conn.execute("DROP TABLE IF EXISTS questions CASCADE")
            await conn.execute("DROP TABLE IF EXISTS _migrations CASCADE")
            print("  ✓ Tables dropped")
        
        # Ensure migrations table exists
        await ensure_migrations_table(conn)
        
        # Run PostgreSQL migrations
        print("\n📄 PostgreSQL Migrations:")
        print("-" * 40)
        
        applied_pg = await get_applied_migrations(conn, "postgres")
        pg_files = get_migration_files("postgres")
        
        pg_pending = 0
        for file_path in pg_files:
            name = file_path.stem
            if name in applied_pg:
                print(f"  ✓ {name} (already applied)")
                continue
            
            print(f"  → Running: {name}")
            if await run_postgres_migration(conn, file_path):
                await record_migration(conn, name, "postgres")
                print(f"    ✓ Applied: {name}")
                pg_pending += 1
            else:
                print(f"    ✗ Failed: {name}")
                return
        
        if pg_pending == 0:
            print("  No pending migrations")
        
        # Run MinIO migrations
        print("\n🗄️  MinIO Migrations:")
        print("-" * 40)
        
        applied_minio = await get_applied_migrations(conn, "minio")
        minio_files = get_migration_files("minio")
        
        minio_pending = 0
        for file_path in minio_files:
            name = file_path.stem
            if name in applied_minio:
                print(f"  ✓ {name} (already applied)")
                continue
            
            print(f"  → Running: {name}")
            if run_minio_migration(minio_client, file_path):
                await record_migration(conn, name, "minio")
                print(f"    ✓ Applied: {name}")
                minio_pending += 1
            else:
                print(f"    ✗ Failed: {name}")
                return
        
        if minio_pending == 0:
            print("  No pending migrations")
        
        print("\n" + "=" * 60)
        print("✅ Migration complete!")
        print(f"   PostgreSQL: {pg_pending} new, {len(applied_pg)} existing")
        print(f"   MinIO: {minio_pending} new, {len(applied_minio)} existing")
        print("=" * 60)
        
    finally:
        await conn.close()


async def show_status():
    """Show migration status."""
    print("=" * 60)
    print("TOEFL Speaking - Migration Status")
    print("=" * 60)
    
    conn = await get_db_connection()
    
    try:
        await ensure_migrations_table(conn)
        
        # PostgreSQL status
        print("\n📄 PostgreSQL Migrations:")
        print("-" * 40)
        
        applied_pg = await get_applied_migrations(conn, "postgres")
        pg_files = get_migration_files("postgres")
        
        for file_path in pg_files:
            name = file_path.stem
            status = "✓ applied" if name in applied_pg else "○ pending"
            print(f"  {status}: {name}")
        
        # MinIO status
        print("\n🗄️  MinIO Migrations:")
        print("-" * 40)
        
        applied_minio = await get_applied_migrations(conn, "minio")
        minio_files = get_migration_files("minio")
        
        for file_path in minio_files:
            name = file_path.stem
            status = "✓ applied" if name in applied_minio else "○ pending"
            print(f"  {status}: {name}")
        
        print()
        
    finally:
        await conn.close()


def main():
    parser = argparse.ArgumentParser(description="Run database and MinIO migrations")
    parser.add_argument("--status", action="store_true", help="Show migration status")
    parser.add_argument("--fresh", action="store_true", help="Drop all tables and re-run migrations (DESTRUCTIVE!)")
    
    args = parser.parse_args()
    
    if args.status:
        asyncio.run(show_status())
    elif args.fresh:
        confirm = input("\n⚠️  WARNING: This will DELETE ALL DATA! Type 'yes' to continue: ")
        if confirm.lower() == "yes":
            asyncio.run(run_migrations(fresh=True))
        else:
            print("Aborted.")
    else:
        asyncio.run(run_migrations())


if __name__ == "__main__":
    main()
