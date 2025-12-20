"""ASR service using Volcengine (Doubao) and OpenAI Whisper."""

import httpx
import tempfile
import os
from openai import AsyncOpenAI
from pydub import AudioSegment
from app.config import settings


async def transcribe_audio_openai(audio_url: str) -> dict:
    """
    Transcribe audio using OpenAI Whisper API.
    
    Args:
        audio_url: URL to the MP3 audio file (already converted at upload)
        
    Returns:
        dict: {
            "text": "Full text",
            "segments": [
                {"start": 0.0, "end": 2.5, "text": "Sentence 1."},
                ...
            ]
        }
    """
    if not settings.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not set")
        
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    # Download MP3 audio to temp file
    async with httpx.AsyncClient() as http_client:
        response = await http_client.get(audio_url)
        response.raise_for_status()
        audio_bytes = response.content
        
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_audio:
        temp_audio.write(audio_bytes)
        temp_audio_path = temp_audio.name

    try:
        with open(temp_audio_path, "rb") as audio_file:
            # Call OpenAI Whisper
            # timestamp_granularities=['segment'] gives us start/end times
            transcription = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json",
                timestamp_granularities=["segment"]
            )
            
        return {
            "text": transcription.text,
            "segments": [
                {
                    "start": seg.start,
                    "end": seg.end,
                    "text": seg.text
                } 
                for seg in transcription.segments
            ]
        }
        
    finally:
        # Cleanup temp file
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)


async def transcribe_audio(audio_url: str) -> str:
    """
    Transcribe audio using Volcengine ASR service.
    
    Args:
        audio_url: Presigned URL to the audio file
        
    Returns:
        Transcribed text
    """
    # TODO: Implement actual Volcengine ASR API call
    # For now, return a placeholder
    
    if not settings.VOLCENGINE_API_KEY:
        # Mock response for development
        return "[Mock Transcript] I believe taking a gap year is beneficial for students. It allows them to gain real-world experience and achieve financial independence. Additionally, they can gain career clarity before committing to a specific field of study. So, I agree with this statement."
    
    # Actual implementation would be:
    # async with httpx.AsyncClient() as client:
    #     response = await client.post(
    #         "https://openspeech.bytedance.com/api/v1/asr",
    #         headers={
    #             "Authorization": f"Bearer {settings.VOLCENGINE_API_KEY}",
    #             "Content-Type": "application/json"
    #         },
    #         json={
    #             "audio_url": audio_url,
    #             "language": "en-US",
    #             "enable_timestamps": True
    #         }
    #     )
    #     result = response.json()
    #     return result.get("text", "")
    
    return "[Transcription pending - API not configured]"


async def segment_audio_by_chunks(
    audio_url: str,
    chunks: list[dict],
    recording_id: int
) -> list[str]:
    """
    Segment audio using pydub and upload to MinIO.
    
    Args:
        audio_url: Presigned URL to MP3 recording (already converted at upload)
        chunks: List of chunk dicts with start/end times
        recording_id: Recording ID for organizing storage
    
    Returns:
        List of MinIO object keys for each chunk
    """
    from app.services.storage_service import storage_service
    
    # Download MP3 audio
    async with httpx.AsyncClient() as client:
        response = await client.get(audio_url)
        response.raise_for_status()
        audio_bytes = response.content
    
    # Save to temp file for pydub
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_file:
        temp_file.write(audio_bytes)
        temp_path = temp_file.name
    
    try:
        # Load MP3 audio with pydub
        audio = AudioSegment.from_file(temp_path, format="mp3")
        
        object_keys = []
        for i, chunk in enumerate(chunks):
            # Convert seconds to milliseconds
            start_ms = int(chunk["start"] * 1000)
            end_ms = int(chunk["end"] * 1000)
            
            # Extract segment
            segment = audio[start_ms:end_ms]
            
            # Export to temp file
            segment_path = f"/tmp/chunk_{recording_id}_{i}.mp3"
            segment.export(segment_path, format="mp3")
            
            # Upload to MinIO
            object_key = f"chunks/{recording_id}/chunk_{i}.mp3"
            storage_service.upload_audio_sync(
                bucket=storage_service.bucket_recordings,
                object_key=object_key,
                file_path=segment_path,
                content_type="audio/mpeg"
            )
            object_keys.append(object_key)
            
            # Clean up temp segment file
            os.remove(segment_path)
        
        return object_keys
        
    finally:
        # Clean up temp audio file
        os.remove(temp_path)
