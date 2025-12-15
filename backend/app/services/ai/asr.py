"""ASR service using Volcengine (Doubao)."""

import httpx
from app.config import settings


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
