"""
Migration: 002_upload_question_audio
Description: Upload question audio files to MinIO
Created: 2025-12-16
"""

from pathlib import Path


def up(client, settings):
    """Upload question audio files."""
    # Audio files are stored in migrations/audio/
    audio_dir = Path(__file__).parent.parent / "audio"
    
    if not audio_dir.exists():
        print(f"  ⚠ Audio directory not found: {audio_dir}")
        return
    
    bucket = settings.MINIO_BUCKET_QUESTIONS
    
    # Upload MP3 files
    for audio_file in audio_dir.glob("*.mp3"):
        object_key = f"{audio_file.stem}/audio.mp3"
        
        # Check if already exists
        try:
            client.stat_object(bucket, object_key)
            print(f"  Exists: {object_key}")
            continue
        except Exception:
            pass
        
        client.fput_object(
            bucket_name=bucket,
            object_name=object_key,
            file_path=str(audio_file),
            content_type="audio/mpeg"
        )
        print(f"  ✓ Uploaded: {object_key}")
    
    # Upload WAV files
    for audio_file in audio_dir.glob("*.wav"):
        object_key = f"{audio_file.stem}/audio.wav"
        
        try:
            client.stat_object(bucket, object_key)
            print(f"  Exists: {object_key}")
            continue
        except Exception:
            pass
        
        client.fput_object(
            bucket_name=bucket,
            object_name=object_key,
            file_path=str(audio_file),
            content_type="audio/wav"
        )
        print(f"  ✓ Uploaded: {object_key}")


def down(client, settings):
    """Remove uploaded audio files."""
    audio_dir = Path(__file__).parent.parent / "audio"
    bucket = settings.MINIO_BUCKET_QUESTIONS
    
    if not audio_dir.exists():
        return
    
    for audio_file in audio_dir.glob("*.mp3"):
        object_key = f"{audio_file.stem}/audio.mp3"
        try:
            client.remove_object(bucket, object_key)
            print(f"  ✓ Removed: {object_key}")
        except Exception:
            pass
    
    for audio_file in audio_dir.glob("*.wav"):
        object_key = f"{audio_file.stem}/audio.wav"
        try:
            client.remove_object(bucket, object_key)
            print(f"  ✓ Removed: {object_key}")
        except Exception:
            pass
