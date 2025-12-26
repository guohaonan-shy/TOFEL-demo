"""LLM service using Volcengine Doubao and OpenAI GPT-4o for multimodal analysis."""

import json
import base64
import tempfile
import os
from app.config import settings
from app.clients import get_openai_client, get_gemini_client, get_http_client
from app.services.ai.prompts import (
    get_full_audio_analysis_prompt_gemini,
    get_chunk_audio_analysis_prompt_gemini,
    get_chunk_transcript_system_prompt,
    get_full_audio_analysis_prompt_openai,
    get_chunk_audio_analysis_prompt_openai,
    get_parse_global_evaluation_system_prompt,
    get_parse_chunk_feedback_system_prompt,
)
from pydantic import BaseModel, Field
from pydub import AudioSegment
from google.genai import types
from google.genai.types import GenerateContentConfig, Part, Content


# --- V2 Schemas for Content-Aware Chunking ---

# --- Structured Chunk Feedback Schemas ---

class ChunkFeedbackStructured(BaseModel):
    """Refined structured feedback for a chunk."""
    
    # 1. 总体评价 (Coach's Comment)
    overview: str = Field(..., description="A concise, encouraging evaluation of this specific chunk's performance (in Chinese).")

    # 2. 好的地方 (What You Did Well)
    strengths: list[str] = Field(..., description="List of 1-3 positive points (in Chinese).")

    # 3. 待提升的地方 (Areas for Improvement)
    # Mixed list of top issues: pronunciation, grammar, or logic
    weaknesses: list[str] = Field(..., description="List of 1-3 specific issues to fix (pronunciation, grammar, or clarity) (in Chinese).")

    # 4. 改进示范 (The 'Golden' Version)
    corrected_text: str = Field(..., description="The improved English version of this chunk.")

    # 5. 改进解读 (Why It's Better)
    correction_explanation: str = Field(..., description="Explanation of why the corrected version is better (in Chinese).")


class GlobalEvaluationLLM(BaseModel):
    """LLM output - only component scores (0-4 each, TOEFL official scale)."""
    delivery: float = Field(..., ge=0, le=4, description="Delivery score (0-4)")
    language_use: float = Field(..., ge=0, le=4, description="Language use score (0-4)")
    topic_development: float = Field(..., ge=0, le=4, description="Topic development score (0-4)")
    overall_summary: str = Field(..., description="Brief summary in Chinese")
    detailed_feedback: str = Field(..., description="Detailed analysis from audio")


class GlobalEvaluation(BaseModel):
    """Final evaluation with Python-calculated fields."""
    total_score: int = Field(..., ge=0, le=30, description="Total score (0-30 scale)")
    score_breakdown: dict[str, float] = Field(
        ..., 
        description="delivery, language_use, topic_development (each 0-4.0, TOEFL official scale)"
    )
    level: str = Field(..., description="Excellent/Good/Fair/Weak based on total_score")
    overall_summary: str = Field(..., description="Brief summary in Chinese")
    detailed_feedback: str = Field(..., description="Detailed analysis from audio")


class FullTranscript(BaseModel):
    """Transcript from Whisper."""
    text: str
    segments: list[dict]  # [{start, end, text}]


class ChunkInfo(BaseModel):
    """Individual chunk analysis."""
    chunk_id: int
    chunk_type: str = Field(..., description="opening_statement, viewpoint, closing_statement, etc.")
    time_range: list[float] = Field(..., description="[start, end] in seconds for frontend playback")
    text: str = Field(..., description="Text from Whisper for display")
    feedback_structured: ChunkFeedbackStructured = Field(..., description="Structured feedback with pronunciation, grammar, and expression analysis")
    cloned_audio_url: str | None = Field(None, description="Presigned URL to cloned voice audio (corrected version)")


class ToeflReportV2(BaseModel):
    """Complete analysis report v2."""
    analysis_version: str = "2.0"
    global_evaluation: GlobalEvaluation
    full_transcript: FullTranscript
    chunks: list[ChunkInfo]


# --- V2 Functions for Content-Aware Chunking ---

def _get_audio_provider() -> str:
    """Determine which AI provider to use for audio analysis."""
    provider = settings.AUDIO_AI_PROVIDER.lower()
    
    if provider == "gemini":
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is required when AUDIO_AI_PROVIDER=gemini")
        return "gemini"
    elif provider == "openai":
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is required when AUDIO_AI_PROVIDER=openai")
        return "openai"
    else:  # auto
        if settings.GEMINI_API_KEY:
            return "gemini"
        elif settings.OPENAI_API_KEY:
            return "openai"
        else:
            raise ValueError("No AI provider API key configured")


async def analyze_full_audio_gemini(audio_url: str, question_text: str) -> GlobalEvaluation:
    """
    Analyze full audio using Gemini 2.5 Pro with structured JSON output.
    
    Args:
        audio_url: Presigned URL to the MP3 audio file
        question_text: The TOEFL question
        
    Returns:
        GlobalEvaluation: Structured evaluation with scores
    """
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set")
    
    # Use singleton clients
    client = get_gemini_client()
    http_client = get_http_client()
    
    # Download audio
    response = await http_client.get(audio_url)
    response.raise_for_status()
    audio_bytes = response.content
    
    # Save to temp file
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_file:
        temp_file.write(audio_bytes)
        temp_path = temp_file.name
    
    try:
        # Upload audio to Gemini
        audio_file = client.files.upload(
            file=temp_path,
            config=types.UploadFileConfig(mimeType="audio/mpeg")
        )
        
        # Generate analysis with JSON schema
        prompt = get_full_audio_analysis_prompt_gemini(question_text)
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                Content(
                    parts=[
                        Part.from_uri(file_uri=audio_file.uri, mime_type="audio/mpeg"),
                        Part.from_text(text=prompt)
                    ]
                )
            ],
            config=GenerateContentConfig(
                response_mime_type="application/json",
                response_schema={
                    "type": "object",
                    "properties": {
                        "scores": {
                            "type": "object",
                            "properties": {
                                "delivery": {"type": "number", "minimum": 0, "maximum": 4},
                                "language_use": {"type": "number", "minimum": 0, "maximum": 4},
                                "topic_development": {"type": "number", "minimum": 0, "maximum": 4},
                                "overall_score": {"type": "number", "minimum": 0, "maximum": 30}
                            },
                            "required": ["delivery", "language_use", "topic_development", "overall_score"]
                        },
                        "overall_summary": {"type": "string"},
                        "detailed_feedback": {
                            "type": "object",
                            "properties": {
                                "delivery_comment": {"type": "string"},
                                "language_use_comment": {"type": "string"},
                                "topic_development_comment": {"type": "string"}
                            },
                            "required": ["delivery_comment", "language_use_comment", "topic_development_comment"]
                        }
                    },
                    "required": ["scores", "overall_summary", "detailed_feedback"]
                }
            )
        )
        
        # Parse JSON response
        result_json = json.loads(response.text)
        scores = result_json["scores"]
        
        # Extract 0-4 scale scores from Gemini
        delivery_0_4 = scores["delivery"]
        language_use_0_4 = scores["language_use"]
        topic_development_0_4 = scores["topic_development"]
        
        # Calculate total_score using Python (avoid model hallucination)
        # Formula: (average_score / 4) * 30
        average_score = (delivery_0_4 + language_use_0_4 + topic_development_0_4) / 3
        total_score = round((average_score / 4) * 30)  # Round to integer (0-30 scale)
        
        # Keep scores in 0-4 scale (TOEFL official standard) for frontend display
        # Round to 1 decimal place for better precision
        delivery_score = round(delivery_0_4, 1)
        language_use_score = round(language_use_0_4, 1)
        topic_development_score = round(topic_development_0_4, 1)
        
        # Determine level based on total_score (0-30 scale)
        if total_score >= 24:
            level = "Excellent"
        elif total_score >= 18:
            level = "Good"
        elif total_score >= 14:
            level = "Fair"
        else:
            level = "Weak"
        
        # Combine detailed feedback into a single text
        detailed_feedback_obj = result_json["detailed_feedback"]
        detailed_feedback_text = f"""**表达 (Delivery)**
{detailed_feedback_obj['delivery_comment']}

**语言使用 (Language Use)**
{detailed_feedback_obj['language_use_comment']}

**话题展开 (Topic Development)**
{detailed_feedback_obj['topic_development_comment']}"""
        
        return GlobalEvaluation(
            total_score=total_score,
            score_breakdown={
                "delivery": delivery_score,
                "language_use": language_use_score,
                "topic_development": topic_development_score
            },
            level=level,
            overall_summary=result_json["overall_summary"],
            detailed_feedback=detailed_feedback_text
        )
        
    finally:
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)


async def analyze_chunk_audio_gemini(
    chunk_audio_bytes: bytes,
    chunk_text: str,
    chunk_type: str,
    previous_chunks_context: list[dict] | None = None
) -> ChunkFeedbackStructured:
    """
    Analyze chunk audio using Gemini 2.5 Pro with structured JSON output.
    Returns structured feedback with pronunciation, grammar, and expression analysis.
    
    Args:
        chunk_audio_bytes: MP3 audio bytes for this chunk
        chunk_text: Text content of the chunk
        chunk_type: Type of chunk (opening_statement, viewpoint)
        previous_chunks_context: Optional list of previous chunks with their type and summary
        
    Returns:
        ChunkFeedbackStructured: Structured feedback object
    """
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set")
    
    # Use singleton Gemini client
    client = get_gemini_client()
    
    # Write audio bytes to temp file for Gemini upload
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_file:
        temp_file.write(chunk_audio_bytes)
        temp_path = temp_file.name
    
    try:
        audio_file = client.files.upload(
            file=temp_path,
            config=types.UploadFileConfig(mimeType="audio/mpeg")
        )
        
        prompt = get_chunk_audio_analysis_prompt_gemini(
            chunk_text, 
            chunk_type, 
            previous_chunks_context
        )
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                Content(
                    parts=[
                        Part.from_uri(file_uri=audio_file.uri, mime_type="audio/mpeg"),
                        Part.from_text(text=prompt)
                    ]
                )
            ],
            config=GenerateContentConfig(
                response_mime_type="application/json",
                response_schema={
                    "type": "object",
                    "properties": {
                        "overview": {
                            "type": "string",
                            "description": "Concise coach's comment (in Chinese)"
                        },
                        "strengths": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "1-3 positive points (in Chinese)"
                        },
                        "weaknesses": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "1-3 key issues to fix (in Chinese)"
                        },
                        "corrected_text": {
                            "type": "string",
                            "description": "Improved English version"
                        },
                        "correction_explanation": {
                            "type": "string",
                            "description": "Why the improved version is better (in Chinese)"
                        }
                    },
                    "required": ["overview", "strengths", "weaknesses", "corrected_text", "correction_explanation"]
                }
            )
        )
        
        # Parse JSON response and validate with Pydantic
        result_json = json.loads(response.text)
        return ChunkFeedbackStructured(**result_json)
        
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


async def chunk_transcript_by_content(
    transcript_data: dict,
    question_text: str
) -> dict:
    """
    Use Text GPT to intelligently chunk transcript by content structure.
    
    Args:
        transcript_data: Dict with 'text' and 'segments' from Whisper
        question_text: The TOEFL question
        
    Returns:
        dict: {
            "chunks": [
                {
                    "chunk_id": 0,
                    "chunk_type": "opening_statement",
                    "start": 0.0,
                    "end": 5.2,
                    "text": "I believe that..."
                },
                ...
            ]
        }
    """
    if not settings.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not set")
    
    # Use singleton OpenAI client
    client = get_openai_client()
    
    # Format transcript with timestamps
    formatted_segments = "\n".join([
        f"[{seg['start']:.2f}-{seg['end']:.2f}] {seg['text']}"
        for seg in transcript_data['segments']
    ])
    
    response = await client.chat.completions.create(
        model="gpt-5",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": get_chunk_transcript_system_prompt()
            },
            {
                "role": "user",
                "content": f"问题：{question_text}\n\n转录文本（带时间戳）：\n{formatted_segments}"
            }
        ]
    )
    
    return json.loads(response.choices[0].message.content)


async def analyze_full_audio(audio_url: str, question_text: str) -> str:
    """
    Analyze full audio using Audio GPT for comprehensive evaluation.
    Returns text with scores and detailed feedback.
    
    Args:
        audio_url: Presigned URL to the MP3 audio file (already converted at upload)
        question_text: The TOEFL question
        
    Returns:
        str: Markdown text with scores and analysis
    """
    if not settings.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not set")
    
    # Use singleton clients
    client = get_openai_client()
    http_client = get_http_client()
    
    # Download MP3 audio (already converted at upload time)
    response = await http_client.get(audio_url)
    response.raise_for_status()
    audio_bytes = response.content
    
    # Encode MP3 to base64 (no conversion needed)
    audio_base64 = base64.b64encode(audio_bytes).decode()
    
    # Call Audio GPT
    completion = await client.chat.completions.create(
        model="gpt-4o-audio-preview",
        modalities=["text"],
        audio={"voice": "alloy", "format": "mp3"},
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_audio",
                        "input_audio": {"data": audio_base64, "format": "mp3"}
                    },
                    {
                        "type": "text",
                        "text": get_full_audio_analysis_prompt_openai(question_text)
                    }
                ]
            }
        ]
    )
    
    return completion.choices[0].message.content


async def analyze_chunk_audio(
    chunk_audio_bytes: bytes,
    chunk_text: str,
    chunk_type: str,
    previous_chunks_context: list[dict] | None = None
) -> str:
    """
    Analyze individual chunk audio using Audio GPT.
    Returns comprehensive feedback (delivery + content + grammar).

    Args:
        chunk_audio_bytes: MP3 audio bytes for this chunk
        chunk_text: Text content of the chunk
        chunk_type: Type of chunk (opening_statement, viewpoint)
        previous_chunks_context: Optional list of previous chunks with their type and summary

    Returns:
        str: Markdown text with comprehensive feedback
    """
    if not settings.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not set")

    # Use singleton OpenAI client
    client = get_openai_client()

    # Encode audio bytes to base64 for OpenAI API
    audio_base64 = base64.b64encode(chunk_audio_bytes).decode()
    
    completion = await client.chat.completions.create(
        model="gpt-4o-audio-preview",
        modalities=["text"],
        audio={"voice": "alloy", "format": "mp3"},
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_audio",
                        "input_audio": {"data": audio_base64, "format": "mp3"}
                    },
                    {
                        "type": "text",
                        "text": get_chunk_audio_analysis_prompt_openai(
                            chunk_text, 
                            chunk_type, 
                            previous_chunks_context
                        )
                    }
                ]
            }
        ]
    )
    
    return completion.choices[0].message.content


async def parse_global_evaluation_to_json(
    evaluation_text: str,
    transcript: str
) -> GlobalEvaluation:
    """
    Extract 3 scores from text, then Python calculates total_score and level.
    
    Args:
        evaluation_text: Markdown text from analyze_full_audio
        transcript: Full transcript text
        
    Returns:
        GlobalEvaluation: Structured evaluation with calculated total_score and level
    """
    if not settings.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not set")
    
    # Use singleton OpenAI client
    client = get_openai_client()
    
    # Step 1: LLM extracts component scores
    completion = await client.beta.chat.completions.parse(
        model="gpt-4o-2024-08-06",
        messages=[
            {
                "role": "system",
                "content": get_parse_global_evaluation_system_prompt()
            },
            {
                "role": "user",
                "content": f"评价文本：\n{evaluation_text}\n\n转录：\n{transcript}"
            }
        ],
        response_format=GlobalEvaluationLLM
    )
    
    llm_result = completion.choices[0].message.parsed
    
    # Step 2: Python calculates total_score and level
    # LLM returns 0-4 scale, convert to 0-30 scale
    average_score = (
        llm_result.delivery + 
        llm_result.language_use + 
        llm_result.topic_development
    ) / 3
    total_score = round((average_score / 4) * 30)  # Convert to 0-30 scale
    
    if total_score >= 24:
        level = "Excellent"
    elif total_score >= 18:
        level = "Good"
    elif total_score >= 14:
        level = "Fair"
    else:
        level = "Weak"
    
    # Step 3: Build final GlobalEvaluation (keep 0-4 scale for component scores)
    return GlobalEvaluation(
        total_score=total_score,
        score_breakdown={
            "delivery": round(llm_result.delivery, 1),
            "language_use": round(llm_result.language_use, 1),
            "topic_development": round(llm_result.topic_development, 1)
        },
        level=level,
        overall_summary=llm_result.overall_summary,
        detailed_feedback=llm_result.detailed_feedback
    )


async def parse_chunk_feedback_to_json(
    feedback_text: str,
    chunk_text: str,
    chunk_type: str
) -> ChunkFeedbackStructured:
    """
    Parse markdown feedback from analyze_chunk_audio into structured JSON.
    Uses OpenAI structured output parsing (same pattern as global evaluation).
    
    Args:
        feedback_text: Markdown text from analyze_chunk_audio
        chunk_text: Original chunk text for context
        chunk_type: Type of chunk (opening_statement, viewpoint)
        
    Returns:
        ChunkFeedbackStructured: Structured feedback object
    """
    if not settings.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not set")
    
    # Use singleton OpenAI client
    client = get_openai_client()
    
    # Parse markdown into structured format
    completion = await client.beta.chat.completions.parse(
        model="gpt-4o-2024-08-06",
        messages=[
            {
                "role": "system",
                "content": get_parse_chunk_feedback_system_prompt()
            },
            {
                "role": "user",
                "content": f"""分析文本：
{feedback_text}

原始转录：
{chunk_text}

类型：{chunk_type}

请提取结构化反馈。"""
            }
        ],
        response_format=ChunkFeedbackStructured
    )
    
    return completion.choices[0].message.parsed


# --- Unified Interface Functions ---

async def analyze_full_audio_unified(audio_url: str, question_text: str) -> GlobalEvaluation:
    """
    Unified interface for full audio analysis with provider selection and fallback.
    
    Args:
        audio_url: Presigned URL to the MP3 audio file
        question_text: The TOEFL question
        
    Returns:
        GlobalEvaluation: Structured evaluation with scores
    """
    provider = _get_audio_provider()
    
    if provider == "gemini":
        try:
            return await analyze_full_audio_gemini(audio_url, question_text)
        except Exception as e:
            # Fallback to OpenAI if Gemini fails
            if settings.OPENAI_API_KEY:
                print(f"Gemini analysis failed: {e}. Falling back to OpenAI.")
                global_text = await analyze_full_audio(audio_url, question_text)
                return await parse_global_evaluation_to_json(global_text, "")
            else:
                raise
    else:  # openai
        global_text = await analyze_full_audio(audio_url, question_text)
        return await parse_global_evaluation_to_json(global_text, "")


async def analyze_chunk_audio_unified(
    chunk_audio_bytes: bytes,
    chunk_text: str,
    chunk_type: str,
    previous_chunks_context: list[dict] | None = None
) -> ChunkFeedbackStructured:
    """
    Unified interface for chunk audio analysis with provider selection and fallback.
    
    Args:
        chunk_audio_bytes: MP3 audio bytes for this chunk
        chunk_text: Text content of the chunk
        chunk_type: Type of chunk (opening_statement, viewpoint)
        previous_chunks_context: Optional list of previous chunks with their type and summary
        
    Returns:
        ChunkFeedbackStructured: Structured feedback object
    """
    provider = _get_audio_provider()
    
    if provider == "gemini":
        try:
            return await analyze_chunk_audio_gemini(
                chunk_audio_bytes, 
                chunk_text, 
                chunk_type, 
                previous_chunks_context
            )
        except Exception as e:
            if settings.OPENAI_API_KEY:
                print(f"Gemini chunk analysis failed: {e}. Falling back to OpenAI.")
                # Fallback to OpenAI two-step process
                feedback_text = await analyze_chunk_audio(
                    chunk_audio_bytes, 
                    chunk_text, 
                    chunk_type, 
                    previous_chunks_context
                )
                return await parse_chunk_feedback_to_json(feedback_text, chunk_text, chunk_type)
            else:
                raise Exception(f"Gemini chunk analysis failed: {e}")
    else:  # openai
        # Step 1: Audio analysis (markdown)
        feedback_text = await analyze_chunk_audio(
            chunk_audio_bytes, 
            chunk_text, 
            chunk_type, 
            previous_chunks_context
        )
        # Step 2: Parse to structured JSON
        return await parse_chunk_feedback_to_json(feedback_text, chunk_text, chunk_type)


# --- Legacy / Volcengine Logic ---

async def generate_report(
    audio_url: str,
    transcript: str,
    question_instruction: str
) -> str:
    """Legacy report generation."""
    if not settings.VOLCENGINE_API_KEY:
        return generate_mock_report(transcript, question_instruction)
    return generate_mock_report(transcript, question_instruction)

def generate_mock_report(transcript: str, question_instruction: str) -> str:
    return f"""# TOEFL Speaking 分析报告 (Mock)
...
"""
