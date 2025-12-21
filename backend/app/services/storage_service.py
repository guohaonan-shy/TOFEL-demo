"""Supabase Storage service for audio files using S3 compatible API."""

import logging
from datetime import timedelta
from io import BytesIO

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError

from app.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    """Service for interacting with Supabase Storage via S3 compatible API."""
    
    def __init__(self):
        self._client = None
        self.bucket_questions = settings.STORAGE_BUCKET_QUESTIONS
        self.bucket_recordings = settings.STORAGE_BUCKET_RECORDINGS
    
    @property
    def client(self):
        """Lazy initialization of S3 client for Supabase Storage."""
        if self._client is None:
            if not settings.STORAGE_ACCESS_KEY or not settings.STORAGE_SECRET_KEY:
                raise ValueError(
                    "STORAGE_ACCESS_KEY and STORAGE_SECRET_KEY must be set. "
                    "Run `supabase status` and copy keys from Storage (S3) section"
                )
            
            self._client = boto3.client(
                's3',
                endpoint_url=settings.STORAGE_ENDPOINT,
                aws_access_key_id=settings.STORAGE_ACCESS_KEY,
                aws_secret_access_key=settings.STORAGE_SECRET_KEY,
                region_name=settings.STORAGE_REGION,
                config=BotoConfig(signature_version='s3v4')
            )
        return self._client
    
    def ensure_bucket(self, bucket: str) -> bool:
        """Ensure a specific bucket exists, create if not."""
        try:
            self.client.head_bucket(Bucket=bucket)
            return True
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            if error_code in ('404', 'NoSuchBucket'):
                try:
                    self.client.create_bucket(Bucket=bucket)
                    logger.info(f"Created bucket: {bucket}")
                    return True
                except Exception as create_err:
                    logger.error(f"Failed to create bucket {bucket}: {create_err}")
                    return False
            else:
                logger.error(f"Error checking bucket {bucket}: {e}")
                return False
    
    def ensure_buckets(self):
        """Ensure all required buckets exist."""
        for bucket in [self.bucket_questions, self.bucket_recordings]:
            self.ensure_bucket(bucket)
    
    async def upload_audio(
        self,
        bucket: str,
        object_key: str,
        data: bytes,
        content_type: str = "audio/webm"
    ) -> str:
        """
        Upload audio file to Storage.
        
        Args:
            bucket: Target bucket name
            object_key: Object key (path) in the bucket
            data: Audio file bytes
            content_type: MIME type of the audio
            
        Returns:
            The object key for reference
        """
        try:
            # Ensure bucket exists before upload
            self.ensure_bucket(bucket)
            
            self.client.put_object(
                Bucket=bucket,
                Key=object_key,
                Body=BytesIO(data),
                ContentType=content_type
            )
            return object_key
        except Exception as e:
            logger.error(f"Failed to upload audio to {bucket}/{object_key}: {e}")
            raise Exception(f"Failed to upload audio: {e}")
    
    def get_presigned_url(
        self,
        bucket: str,
        object_key: str,
        expires: timedelta = timedelta(hours=1)
    ) -> str:
        """
        Generate a presigned URL for audio access.
        
        Args:
            bucket: Bucket name
            object_key: Object key in the bucket
            expires: URL expiration time
            
        Returns:
            Presigned URL for direct access
        """
        try:
            expires_in = int(expires.total_seconds())
            url = self.client.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket, 'Key': object_key},
                ExpiresIn=expires_in
            )
            return url
        except Exception as e:
            logger.error(f"Failed to generate presigned URL for {bucket}/{object_key}: {e}")
            raise Exception(f"Failed to generate presigned URL: {e}")
    
    def get_public_url(self, bucket: str, object_key: str) -> str:
        """
        Get public URL for a file in a public bucket.
        
        Args:
            bucket: Bucket name
            object_key: Object key in the bucket
            
        Returns:
            Public URL for direct access
        """
        # Construct public URL for Supabase Storage
        base_url = settings.SUPABASE_URL.rstrip('/')
        return f"{base_url}/storage/v1/object/public/{bucket}/{object_key}"
    
    def download_audio(self, bucket: str, object_key: str) -> bytes:
        """
        Download audio file from Storage.
        
        Args:
            bucket: Bucket name
            object_key: Object key in the bucket
            
        Returns:
            Audio file bytes
        """
        try:
            response = self.client.get_object(Bucket=bucket, Key=object_key)
            return response['Body'].read()
        except Exception as e:
            logger.error(f"Failed to download audio from {bucket}/{object_key}: {e}")
            raise Exception(f"Failed to download audio: {e}")
    
    def upload_audio_sync(
        self,
        bucket: str,
        object_key: str,
        file_path: str | None = None,
        data: bytes | None = None,
        content_type: str = "audio/mpeg"
    ) -> str:
        """
        Synchronous upload from file path or bytes.
        
        Args:
            bucket: Target bucket
            object_key: Object path in bucket
            file_path: Local file path (optional if data is provided)
            data: Audio bytes (optional if file_path is provided)
            content_type: MIME type
        
        Returns:
            Object key
        """
        try:
            if data is not None:
                self.client.put_object(
                    Bucket=bucket,
                    Key=object_key,
                    Body=BytesIO(data),
                    ContentType=content_type
                )
            elif file_path is not None:
                with open(file_path, "rb") as f:
                    self.client.put_object(
                        Bucket=bucket,
                        Key=object_key,
                        Body=f,
                        ContentType=content_type
                    )
            else:
                raise ValueError("Either file_path or data must be provided")
            return object_key
        except Exception as e:
            logger.error(f"Failed to upload audio: {e}")
            raise Exception(f"Failed to upload audio: {e}")


# Global instance
storage_service = StorageService()
