"""ASR service using Volcengine (Doubao) and OpenAI Whisper."""

import httpx
import tempfile
import os
from openai import AsyncOpenAI
from app.config import settings


async def transcribe_audio_openai(audio_url: str) -> dict:
    """
    Transcribe audio using OpenAI Whisper API.
    
    Args:
        audio_url: URL to the audio file (can be local or remote)
        
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
    
    # Download audio to temp file
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
