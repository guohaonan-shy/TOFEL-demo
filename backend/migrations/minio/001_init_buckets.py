"""
Migration: 001_init_buckets
Description: Create required MinIO buckets with appropriate access policies
Created: 2025-12-16
"""

import json


# Public read policy template
PUBLIC_READ_POLICY = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {"AWS": "*"},
            "Action": ["s3:GetObject"],
            "Resource": ["arn:aws:s3:::{bucket}/*"]
        }
    ]
}


def up(client, settings):
    """Create buckets with access policies."""
    # Bucket configurations: (bucket_name, is_public)
    bucket_configs = [
        (settings.MINIO_BUCKET_QUESTIONS, True),   # Public: question audio
        (settings.MINIO_BUCKET_RECORDINGS, True),  # Public: user recordings
    ]
    
    for bucket, is_public in bucket_configs:
        # Create bucket if not exists
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
            print(f"  ✓ Created bucket: {bucket}")
        else:
            print(f"  Bucket exists: {bucket}")
        
        # Set public read policy if needed
        if is_public:
            policy = PUBLIC_READ_POLICY.copy()
            policy["Statement"][0]["Resource"] = [f"arn:aws:s3:::{bucket}/*"]
            client.set_bucket_policy(bucket, json.dumps(policy))
            print(f"  ✓ Set public read policy: {bucket}")


def down(client, settings):
    """Remove buckets (use with caution)."""
    bucket_configs = [
        (settings.MINIO_BUCKET_QUESTIONS, True),
        (settings.MINIO_BUCKET_RECORDINGS, False),
    ]
    
    for bucket, _ in bucket_configs:
        if client.bucket_exists(bucket):
            # Note: bucket must be empty to be removed
            client.remove_bucket(bucket)
            print(f"  ✓ Removed bucket: {bucket}")
