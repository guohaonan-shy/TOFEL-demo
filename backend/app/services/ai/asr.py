"""ASR service using Volcengine (Doubao) and OpenAI Whisper."""

import tempfile
import os
from io import BytesIO
from pydub import AudioSegment
from app.config import settings
from app.clients import get_openai_client, get_http_client


async def transcribe_audio_openai_from_bytes(audio_bytes: bytes, filename: str = "audio.mp3") -> dict:
    """
    Transcribe audio using OpenAI Whisper API directly from bytes.
    
    Args:
        audio_bytes: MP3 audio bytes
        filename: Filename hint for the API
        
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
    
    # Use singleton OpenAI client
    client = get_openai_client()
    
    # Create a file-like object from bytes
    audio_file = BytesIO(audio_bytes)
    audio_file.name = filename
    
    # Call OpenAI Whisper
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


async def transcribe_audio_openai(audio_url: str) -> dict:
    """
    Transcribe audio using OpenAI Whisper API (downloads from URL).
    
    Args:
        audio_url: URL to the MP3 audio file
        
    Returns:
        dict with text and segments
    """
    # Download audio using singleton HTTP client
    http_client = get_http_client()
    response = await http_client.get(audio_url)
    response.raise_for_status()
    audio_bytes = response.content
    
    return await transcribe_audio_openai_from_bytes(audio_bytes)


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


def segment_audio_by_chunks_from_bytes(
    audio_bytes: bytes,
    chunks: list[dict]
) -> list[bytes]:
    """
    Segment audio from bytes using pydub (in-memory only, no storage).
    
    Args:
        audio_bytes: MP3 audio bytes
        chunks: List of chunk dicts with start/end times
    
    Returns:
        List of audio bytes for each chunk (for AI analysis only)
    """
    # Load MP3 audio from bytes
    audio = AudioSegment.from_file(BytesIO(audio_bytes), format="mp3")
    
    chunk_audio_list = []
    for chunk in chunks:
        # Convert seconds to milliseconds
        start_ms = int(chunk["start"] * 1000)
        end_ms = int(chunk["end"] * 1000)
        
        # Extract segment
        segment = audio[start_ms:end_ms]
        
        # Export to bytes
        segment_buffer = BytesIO()
        segment.export(segment_buffer, format="mp3")
        chunk_audio_list.append(segment_buffer.getvalue())
    
    return chunk_audio_list


