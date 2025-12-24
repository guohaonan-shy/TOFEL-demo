"""ASR provider base class and factory."""

from abc import ABC, abstractmethod
from typing import TypedDict
from app.clients import get_http_client


class TranscriptionSegment(TypedDict):
    start: float
    end: float
    text: str


class TranscriptionResult(TypedDict):
    text: str
    segments: list[TranscriptionSegment]


class ASRProvider(ABC):
    """Abstract base class for ASR (Automatic Speech Recognition) providers."""
    
    @abstractmethod
    async def transcribe_from_bytes(
        self, 
        audio_bytes: bytes, 
        filename: str = "audio.mp3"
    ) -> TranscriptionResult:
        """
        Transcribe audio from bytes.
        
        Args:
            audio_bytes: Audio file bytes (MP3 format)
            filename: Filename hint for the API
            
        Returns:
            TranscriptionResult with text and segments
        """
        pass
    
    async def transcribe_from_url(self, audio_url: str) -> TranscriptionResult:
        """
        Transcribe audio from URL (downloads then transcribes).
        
        Args:
            audio_url: URL to the audio file
            
        Returns:
            TranscriptionResult with text and segments
        """
        http_client = get_http_client()
        response = await http_client.get(audio_url)
        response.raise_for_status()
        audio_bytes = response.content
        
        return await self.transcribe_from_bytes(audio_bytes)


def create_asr_provider(provider: str = "openai") -> ASRProvider:
    """
    Factory function to create ASR provider instance.
    
    Args:
        provider: Provider name ("openai", "volcengine", etc.)
        
    Returns:
        ASRProvider instance
        
    Raises:
        ValueError: If provider is not supported
    """
    if provider == "openai":
        from .openai import OpenAIASRProvider
        return OpenAIASRProvider()
    else:
        raise ValueError(f"Unsupported ASR provider: {provider}")

