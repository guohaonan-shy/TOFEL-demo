"""OpenAI Whisper ASR provider implementation."""

from io import BytesIO
from app.config import settings
from app.clients import get_openai_client
from .base import ASRProvider, TranscriptionResult


class OpenAIASRProvider(ASRProvider):
    """ASR provider using OpenAI Whisper API."""
    
    async def transcribe_from_bytes(
        self, 
        audio_bytes: bytes, 
        filename: str = "audio.mp3"
    ) -> TranscriptionResult:
        """
        Transcribe audio using OpenAI Whisper API.
        
        Args:
            audio_bytes: MP3 audio bytes
            filename: Filename hint for the API
            
        Returns:
            TranscriptionResult with text and segments
        """
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is not set")
        
        client = get_openai_client()
        
        audio_file = BytesIO(audio_bytes)
        audio_file.name = filename
        
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

