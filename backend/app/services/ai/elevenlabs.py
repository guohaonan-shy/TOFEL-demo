"""ElevenLabs voice cloning and text-to-speech service."""

import io
import httpx
from typing import BinaryIO
from app.config import settings


class ElevenLabsService:
    """Service for ElevenLabs voice cloning and TTS."""

    BASE_URL = "https://api.elevenlabs.io/v1"

    def __init__(self):
        """Initialize ElevenLabs service."""
        if not settings.ELEVENLABS_API_KEY:
            raise ValueError("ELEVENLABS_API_KEY not configured")

        self.api_key = settings.ELEVENLABS_API_KEY
        self.headers = {
            "xi-api-key": self.api_key,
        }

    async def clone_voice_from_audio(
        self,
        audio_file: BinaryIO | bytes,
        voice_name: str,
        description: str = "Cloned voice from user recording"
    ) -> str:
        """
        Clone a voice from an audio file.

        Args:
            audio_file: Audio file (file-like object or bytes)
            voice_name: Name for the cloned voice
            description: Description of the voice

        Returns:
            voice_id: The ID of the cloned voice
        """
        url = f"{self.BASE_URL}/voices/add"

        # Prepare the audio data
        if isinstance(audio_file, bytes):
            audio_data = audio_file
            filename = "audio.mp3"
        else:
            audio_data = audio_file.read()
            filename = getattr(audio_file, 'name', 'audio.mp3')

        # Prepare multipart form data
        files = {
            "files": (filename, audio_data, "audio/mpeg")
        }

        data = {
            "name": voice_name,
            "description": description,
            "labels": '{"use_case": "toefl_practice"}'
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                url,
                headers=self.headers,
                files=files,
                data=data
            )
            response.raise_for_status()
            result = response.json()
            return result["voice_id"]

    async def text_to_speech(
        self,
        text: str,
        voice_id: str,
        model_id: str = "eleven_multilingual_v2",
        voice_settings: dict | None = None
    ) -> bytes:
        """
        Convert text to speech using a cloned voice.

        Args:
            text: Text to convert to speech
            voice_id: ID of the voice to use
            model_id: ElevenLabs model ID (default: eleven_multilingual_v2)
            voice_settings: Optional voice settings (stability, similarity_boost, etc.)

        Returns:
            Audio data as bytes (MP3 format)
        """
        url = f"{self.BASE_URL}/text-to-speech/{voice_id}"

        # Default voice settings for natural speech
        if voice_settings is None:
            voice_settings = {
                "stability": 0.5,
                "similarity_boost": 0.75,
                "style": 0.0,
                "use_speaker_boost": True
            }

        payload = {
            "text": text,
            "model_id": model_id,
            "voice_settings": voice_settings
        }

        headers = {
            **self.headers,
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                url,
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            return response.content

    async def delete_voice(self, voice_id: str) -> None:
        """
        Delete a cloned voice.

        Args:
            voice_id: ID of the voice to delete
        """
        url = f"{self.BASE_URL}/voices/{voice_id}"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.delete(url, headers=self.headers)
            response.raise_for_status()

    async def clone_and_speak(
        self,
        original_audio: BinaryIO | bytes,
        text_to_speak: str,
        voice_name: str = "temp_clone",
        cleanup: bool = True
    ) -> bytes:
        """
        Convenience method to clone a voice and generate speech in one call.
        Optionally cleans up the cloned voice after generation.

        Args:
            original_audio: Original audio to clone voice from
            text_to_speak: Text to speak with the cloned voice
            voice_name: Name for the temporary cloned voice
            cleanup: Whether to delete the cloned voice after use

        Returns:
            Audio data as bytes (MP3 format)
        """
        voice_id = None
        try:
            # Clone the voice
            voice_id = await self.clone_voice_from_audio(
                original_audio,
                voice_name=voice_name
            )

            # Generate speech
            audio_data = await self.text_to_speech(text_to_speak, voice_id)

            return audio_data

        finally:
            # Cleanup if requested
            if cleanup and voice_id:
                try:
                    await self.delete_voice(voice_id)
                except Exception as e:
                    # Log but don't fail if cleanup fails
                    print(f"Warning: Failed to cleanup voice {voice_id}: {e}")


# Singleton instance
_elevenlabs_service = None


def get_elevenlabs_service() -> ElevenLabsService:
    """Get the ElevenLabs service singleton instance."""
    global _elevenlabs_service
    if _elevenlabs_service is None:
        _elevenlabs_service = ElevenLabsService()
    return _elevenlabs_service
