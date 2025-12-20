"""MinIO storage service for audio files."""

from datetime import timedelta
from io import BytesIO
from minio import Minio
from minio.error import S3Error

from app.config import settings


class StorageService:
    """Service for interacting with MinIO object storage."""
    
    def __init__(self):
        self.client = Minio(
            endpoint=settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE
        )
        self.bucket_questions = settings.MINIO_BUCKET_QUESTIONS
        self.bucket_recordings = settings.MINIO_BUCKET_RECORDINGS
    
    def ensure_buckets(self):
        """Ensure required buckets exist."""
        for bucket in [self.bucket_questions, self.bucket_recordings]:
            if not self.client.bucket_exists(bucket):
                self.client.make_bucket(bucket)
                print(f"Created bucket: {bucket}")
    
    async def upload_audio(
        self,
        bucket: str,
        object_key: str,
        data: bytes,
        content_type: str = "audio/webm"
    ) -> str:
        """
        Upload audio file to MinIO.
        
        Args:
            bucket: Target bucket name
            object_key: Object key (path) in the bucket
            data: Audio file bytes
            content_type: MIME type of the audio
            
        Returns:
            The object key for reference
        """
        try:
            self.client.put_object(
                bucket_name=bucket,
                object_name=object_key,
                data=BytesIO(data),
                length=len(data),
                content_type=content_type
            )
            return object_key
        except S3Error as e:
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
            return self.client.presigned_get_object(
                bucket_name=bucket,
                object_name=object_key,
                expires=expires
            )
        except S3Error as e:
            raise Exception(f"Failed to generate presigned URL: {e}")
    
    def download_audio(self, bucket: str, object_key: str) -> bytes:
        """
        Download audio file from MinIO.
        
        Args:
            bucket: Bucket name
            object_key: Object key in the bucket
            
        Returns:
            Audio file bytes
        """
        try:
            response = self.client.get_object(bucket, object_key)
            return response.read()
        except S3Error as e:
            raise Exception(f"Failed to download audio: {e}")
        finally:
            if response:
                response.close()
                response.release_conn()
    
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
                # Upload from bytes
                self.client.put_object(
                    bucket_name=bucket,
                    object_name=object_key,
                    data=BytesIO(data),
                    length=len(data),
                    content_type=content_type
                )
            elif file_path is not None:
                # Upload from file path
                self.client.fput_object(
                    bucket_name=bucket,
                    object_name=object_key,
                    file_path=file_path,
                    content_type=content_type
                )
            else:
                raise ValueError("Either file_path or data must be provided")
            return object_key
        except S3Error as e:
            raise Exception(f"Failed to upload audio: {e}")


# Global instance
storage_service = StorageService()
