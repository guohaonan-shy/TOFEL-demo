#!/usr/bin/env python3
"""
Initialize Supabase Storage buckets and upload question audio files.

Run this after `supabase start` to set up storage.

Usage:
    cd supabase
    
    # Set environment variables from `supabase status` -> Storage (S3)
    export STORAGE_ACCESS_KEY="your-access-key"
    export STORAGE_SECRET_KEY="your-secret-key"
    
    python init_storage.py
"""

import os
import sys
from pathlib import Path

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError

# Configuration - from `supabase status` -> Storage (S3)
STORAGE_ENDPOINT = os.getenv("STORAGE_ENDPOINT", "http://127.0.0.1:54321/storage/v1/s3")
STORAGE_ACCESS_KEY = os.getenv("STORAGE_ACCESS_KEY", "")
STORAGE_SECRET_KEY = os.getenv("STORAGE_SECRET_KEY", "")
STORAGE_REGION = os.getenv("STORAGE_REGION", "local")

# Buckets to create
BUCKETS = [
    "toefl-questions",   # For question audio files
    "toefl-recordings",  # For user recordings
]

# Audio files to upload
AUDIO_DIR = Path(__file__).parent.parent / "backend" / "migrations" / "audio"

AUDIO_FILES = {
    "question_01KCH9WP8W6TZXA5QXS1BFF6AS.mp3": "question_01KCH9WP8W6TZXA5QXS1BFF6AS/audio.mp3",
    "question_01KCH9WP8W6TZXA5QXS1BFF6AT.mp3": "question_01KCH9WP8W6TZXA5QXS1BFF6AT/audio.mp3",
    "question_01KCH9WP8W6TZXA5QXS1BFF6AV.mp3": "question_01KCH9WP8W6TZXA5QXS1BFF6AV/audio.mp3",
}


def create_client():
    """Create S3 client for Supabase Storage."""
    if not STORAGE_ACCESS_KEY or not STORAGE_SECRET_KEY:
        print("Error: STORAGE_ACCESS_KEY and STORAGE_SECRET_KEY not set")
        print()
        print("Run `supabase status` and copy keys from 'Storage (S3)' section:")
        print("  export STORAGE_ACCESS_KEY='...'")
        print("  export STORAGE_SECRET_KEY='...'")
        sys.exit(1)
    
    return boto3.client(
        's3',
        endpoint_url=STORAGE_ENDPOINT,
        aws_access_key_id=STORAGE_ACCESS_KEY,
        aws_secret_access_key=STORAGE_SECRET_KEY,
        region_name=STORAGE_REGION,
        config=BotoConfig(signature_version='s3v4')
    )


def ensure_bucket(client, bucket_name: str) -> bool:
    """Ensure a bucket exists, create if not."""
    try:
        client.head_bucket(Bucket=bucket_name)
        print(f"✅ Bucket exists: {bucket_name}")
        return True
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        if error_code in ('404', 'NoSuchBucket'):
            try:
                client.create_bucket(Bucket=bucket_name)
                print(f"✅ Created bucket: {bucket_name}")
                return True
            except Exception as create_err:
                print(f"❌ Failed to create bucket {bucket_name}: {create_err}")
                return False
        else:
            print(f"❌ Error checking bucket {bucket_name}: {e}")
            return False


def upload_audio_files(client, bucket_name: str):
    """Upload audio files to the questions bucket."""
    print(f"\nUploading audio files to: {bucket_name}")
    print("-" * 50)
    
    for local_file, storage_path in AUDIO_FILES.items():
        local_path = AUDIO_DIR / local_file
        
        if not local_path.exists():
            print(f"⚠️  File not found: {local_path}")
            continue
        
        try:
            with open(local_path, "rb") as f:
                client.put_object(
                    Bucket=bucket_name,
                    Key=storage_path,
                    Body=f,
                    ContentType="audio/mpeg"
                )
            print(f"✅ Uploaded: {local_file} → {storage_path}")
        except Exception as e:
            print(f"❌ Failed: {local_file} - {e}")


def main():
    print("=" * 60)
    print("Supabase Storage Initialization")
    print("=" * 60)
    print(f"\nEndpoint: {STORAGE_ENDPOINT}")
    
    client = create_client()
    
    # Step 1: Create all buckets
    print("\n📦 Creating buckets...")
    print("-" * 50)
    
    for bucket in BUCKETS:
        ensure_bucket(client, bucket)
    
    # Step 2: Upload audio files
    print("\n🎵 Uploading audio files...")
    upload_audio_files(client, "toefl-questions")
    
    # Done
    print("\n" + "=" * 60)
    print("✅ Storage initialization complete!")
    print("=" * 60)
    print("\nVerify in Supabase Studio: http://127.0.0.1:54323")
    print("Navigate to: Storage → toefl-questions / toefl-recordings")


if __name__ == "__main__":
    main()
