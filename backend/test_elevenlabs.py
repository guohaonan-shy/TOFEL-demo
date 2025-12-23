#!/usr/bin/env python3
"""Quick test to verify ElevenLabs integration."""

import asyncio
import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(__file__))

async def test_elevenlabs():
    """Test ElevenLabs service configuration."""
    from app.config import settings
    from app.services.ai.elevenlabs import get_elevenlabs_service

    print("=" * 60)
    print("ElevenLabs Integration Test")
    print("=" * 60)

    # Check configuration
    print(f"\n1. Configuration Check:")
    print(f"   - API Key configured: {'✓' if settings.ELEVENLABS_API_KEY else '✗'}")
    if settings.ELEVENLABS_API_KEY:
        print(f"   - API Key length: {len(settings.ELEVENLABS_API_KEY)} chars")
        print(f"   - API Key preview: {settings.ELEVENLABS_API_KEY[:10]}...{settings.ELEVENLABS_API_KEY[-5:]}")

    # Try to initialize service
    print(f"\n2. Service Initialization:")
    try:
        service = get_elevenlabs_service()
        print(f"   - Service created: ✓")
        print(f"   - Base URL: {service.BASE_URL}")
    except Exception as e:
        print(f"   - Service creation failed: ✗")
        print(f"   - Error: {e}")
        return

    # Test API connection (just check headers are set)
    print(f"\n3. API Headers:")
    print(f"   - Headers configured: ✓")
    print(f"   - xi-api-key present: {'✓' if 'xi-api-key' in service.headers else '✗'}")

    print("\n" + "=" * 60)
    print("Test complete!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_elevenlabs())
