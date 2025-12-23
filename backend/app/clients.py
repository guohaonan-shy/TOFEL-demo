"""Global client instances for external services.

This module manages singleton instances of API clients to avoid
memory leaks and connection pool exhaustion.
"""

import httpx
from openai import AsyncOpenAI
from google import genai

from app.config import settings


# Singleton instances (initialized at startup)
_openai_client: AsyncOpenAI | None = None
_gemini_client: genai.Client | None = None
_http_client: httpx.AsyncClient | None = None


async def init_clients():
    """Initialize all clients at app startup."""
    global _openai_client, _gemini_client, _http_client
    
    print("Initializing clients...")
    
    # Initialize OpenAI client if API key exists
    if settings.OPENAI_API_KEY:
        print("  - Initializing OpenAI client...")
        _openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        print("  ✓ OpenAI client initialized")
    else:
        print("  ⚠ OpenAI API key not configured")
    
    # Initialize Gemini client if API key exists
    if settings.GEMINI_API_KEY:
        print("  - Initializing Gemini client...")
        try:
            _gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
            print("  ✓ Gemini client initialized")
        except Exception as e:
            print(f"  ⚠ Gemini client initialization failed: {e}")
            _gemini_client = None
    else:
        print("  ⚠ Gemini API key not configured")
    
    # Initialize httpx client with connection pooling
    print("  - Initializing HTTP client...")
    limits = httpx.Limits(
        max_connections=100,
        max_keepalive_connections=20
    )
    timeout = httpx.Timeout(
        timeout=60.0,  # Total timeout
        connect=10.0,  # Connection timeout
        read=60.0,     # Read timeout
        write=10.0     # Write timeout
    )
    _http_client = httpx.AsyncClient(
        limits=limits,
        timeout=timeout,
        http2=False  # HTTP/2 requires httpx[http2], use HTTP/1.1
    )
    print("  ✓ HTTP client initialized with connection pooling")
    print("All clients initialized successfully!")


async def close_clients():
    """Close all clients at app shutdown."""
    global _openai_client, _gemini_client, _http_client
    
    # Close OpenAI client
    if _openai_client:
        await _openai_client.close()
        _openai_client = None
        print("✓ OpenAI client closed")
    
    # Close Gemini client (no explicit close method needed)
    if _gemini_client:
        _gemini_client = None
        print("✓ Gemini client cleaned up")
    
    # Close httpx client
    if _http_client:
        await _http_client.aclose()
        _http_client = None
        print("✓ HTTP client closed")


def get_openai_client() -> AsyncOpenAI:
    """Get singleton OpenAI client.
    
    Returns:
        AsyncOpenAI: Singleton OpenAI client instance
        
    Raises:
        RuntimeError: If client is not initialized or API key not configured
    """
    if _openai_client is None:
        raise RuntimeError(
            "OpenAI client not initialized. "
            "Make sure OPENAI_API_KEY is set and init_clients() was called."
        )
    return _openai_client


def get_gemini_client() -> genai.Client:
    """Get singleton Gemini client.
    
    Returns:
        genai.Client: Singleton Gemini client instance
        
    Raises:
        RuntimeError: If client is not initialized or API key not configured
    """
    if _gemini_client is None:
        raise RuntimeError(
            "Gemini client not initialized. "
            "Make sure GEMINI_API_KEY is set and init_clients() was called."
        )
    return _gemini_client


def get_http_client() -> httpx.AsyncClient:
    """Get singleton HTTP client with connection pooling.
    
    Returns:
        httpx.AsyncClient: Singleton HTTP client instance
        
    Raises:
        RuntimeError: If client is not initialized
    """
    if _http_client is None:
        raise RuntimeError(
            "HTTP client not initialized. "
            "Make sure init_clients() was called."
        )
    return _http_client

