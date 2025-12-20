"""LLM service using Volcengine Doubao and OpenAI GPT-4o for multimodal analysis."""

import httpx
import json
import base64
import tempfile
import os
from app.config import settings
from pydantic import BaseModel, Field
from openai import AsyncOpenAI
from pydub import AudioSegment
from google import genai
from google.genai import types
from google.genai.types import GenerateContentConfig, Part, Content


# --- V2 Schemas for Content-Aware Chunking ---

# --- Structured Chunk Feedback Schemas ---

class PronunciationIssue(BaseModel):
    """Individual pronunciation error with correction."""
    word: str = Field(..., description="The mispronounced word")
    your_pronunciation: str | None = Field(None, description="Phonetic representation of how student said it (IPA or simple)")
    correct_pronunciation: str = Field(..., description="Phonetic guide for correct pronunciation (IPA or simple)")
    tip: str = Field(..., description="Specific tip for pronouncing this word correctly (in Chinese)")
    timestamp: float | None = Field(None, description="When this word was spoken in the chunk (seconds from chunk start)")


class GrammarIssue(BaseModel):
    """Grammar error with correction."""
    original: str = Field(..., description="The original incorrect phrase/sentence")
    corrected: str = Field(..., description="The grammatically correct version")
    explanation: str = Field(..., description="Why it's wrong and the grammar rule (in Chinese)")
    error_type: str = Field(..., description="e.g., 'verb tense', 'subject-verb agreement', 'article usage' (in Chinese)")


class ExpressionSuggestion(BaseModel):
    """Vocabulary/expression improvement."""
    original: str = Field(..., description="Student's expression")
    improved: str = Field(..., description="More natural/academic expression")
    reason: str = Field(..., description="Why the improved version is better (in Chinese)")


class ActionableTip(BaseModel):
    """Specific improvement tip."""
    category: str = Field(..., description="e.g., 'pronunciation', 'grammar', 'vocabulary', 'structure', 'fluency' (in Chinese)")
    tip: str = Field(..., description="Specific actionable advice (in Chinese)")


class ChunkFeedbackStructured(BaseModel):
    """Structured feedback for a chunk."""
    
    # Overall assessment
    summary: str = Field(..., description="2-3 sentence summary of this chunk's performance (in Chinese)")
    
    # Pronunciation analysis (from audio LLM)
    pronunciation_issues: list[PronunciationIssue] = Field(
        default_factory=list,
        max_length=5,
        description="Words that were mispronounced with correction tips (0-5 items, dynamic based on actual errors)"
    )
    pronunciation_score: int | None = Field(None, ge=0, le=10, description="Optional pronunciation score for this chunk")
    
    # Grammar analysis
    grammar_issues: list[GrammarIssue] = Field(
        default_factory=list,
        description="Grammar errors found in this chunk (in Chinese)"
    )
    
    # Expression/Vocabulary suggestions
    expression_suggestions: list[ExpressionSuggestion] = Field(
        default_factory=list,
        description="Better ways to express ideas (in Chinese)"
    )
    
    # Fluency & Delivery notes
    fluency_notes: str | None = Field(None, description="Comments on pace, pauses, hesitations (in Chinese)")
    
    # Content/Logic feedback (especially for viewpoint chunks)
    content_notes: str | None = Field(None, description="Comments on logic, relevance, detail support (in Chinese)")
    
    # Actionable tips specific to this chunk
    actionable_tips: list[ActionableTip] = Field(
        default_factory=list,
        description="Specific tips for improving this type of content (in Chinese)"
    )
    
    # Strengths (positive reinforcement!)
    strengths: list[str] = Field(
        default_factory=list,
        description="What the student did well in this chunk (in Chinese)"
    )


class GlobalEvaluationLLM(BaseModel):
    """LLM output - only component scores (0-10 each)."""
    delivery: int = Field(..., ge=0, le=10, description="Delivery score")
    language_use: int = Field(..., ge=0, le=10, description="Language use score")
    topic_development: int = Field(..., ge=0, le=10, description="Topic development score")
    overall_summary: str = Field(..., description="Brief summary in Chinese")
    detailed_feedback: str = Field(..., description="Detailed analysis from audio")


class GlobalEvaluation(BaseModel):
    """Final evaluation with Python-calculated fields."""
    total_score: int = Field(..., ge=0, le=30, description="Sum of three scores")
    score_breakdown: dict[str, int] = Field(
        ..., 
        description="delivery, language_use, topic_development (each 0-10)"
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
    chunk_type: str = Field(..., description="opening_statement, viewpoint, etc.")
    time_range: list[float] = Field(..., description="[start, end] in seconds")
    text: str = Field(..., description="Text from Whisper for display")
    audio_url: str = Field(..., description="MinIO object key for chunk audio")
    feedback_structured: ChunkFeedbackStructured = Field(..., description="Structured feedback with pronunciation, grammar, and expression analysis")


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
    
    # Create client
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    
    # Download audio with extended timeout
    timeout = httpx.Timeout(60.0, connect=10.0)  # 60s read, 10s connect
    async with httpx.AsyncClient(timeout=timeout) as http_client:
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
        prompt = f"""你是托福口语评分专家，请用中文分析这段录音并评分。

题目：{question_text}

评分标准（各维度0-10分）：
1. **Delivery（表达）**: 发音清晰度、流利度、语调自然度
2. **Language Use（语言）**: 语法准确性、词汇丰富度、句式多样性
3. **Topic Development（主题）**: 内容相关性、论证逻辑、细节支撑

请仔细听录音后，用**中文**返回JSON格式的评价：
- delivery: 表达维度分数（0-10）
- language_use: 语言维度分数（0-10）
- topic_development: 主题维度分数（0-10）
- overall_summary: 2-3句话的整体评价（必须用中文）
- detailed_feedback: 详细的分析反馈，包含三个维度的具体评价（必须用中文，markdown格式）

重要：所有文字内容（overall_summary 和 detailed_feedback）必须用中文书写！"""
        
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
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
                        "delivery": {"type": "integer", "minimum": 0, "maximum": 10},
                        "language_use": {"type": "integer", "minimum": 0, "maximum": 10},
                        "topic_development": {"type": "integer", "minimum": 0, "maximum": 10},
                        "overall_summary": {"type": "string"},
                        "detailed_feedback": {"type": "string"}
                    },
                    "required": ["delivery", "language_use", "topic_development", "overall_summary", "detailed_feedback"]
                }
            )
        )
        
        # Parse JSON response
        result_json = json.loads(response.text)
        
        # Build GlobalEvaluation with Python-calculated fields
        total_score = (
            result_json["delivery"] + 
            result_json["language_use"] + 
            result_json["topic_development"]
        )
        
        if total_score >= 24:
            level = "Excellent"
        elif total_score >= 18:
            level = "Good"
        elif total_score >= 14:
            level = "Fair"
        else:
            level = "Weak"
        
        return GlobalEvaluation(
            total_score=total_score,
            score_breakdown={
                "delivery": result_json["delivery"],
                "language_use": result_json["language_use"],
                "topic_development": result_json["topic_development"]
            },
            level=level,
            overall_summary=result_json["overall_summary"],
            detailed_feedback=result_json["detailed_feedback"]
        )
        
    finally:
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)


async def analyze_chunk_audio_gemini(
    chunk_audio_url: str,
    chunk_text: str,
    chunk_type: str
) -> ChunkFeedbackStructured:
    """
    Analyze chunk audio using Gemini 2.5 Pro with structured JSON output.
    Returns structured feedback with pronunciation, grammar, and expression analysis.
    
    Args:
        chunk_audio_url: Presigned URL to chunk audio
        chunk_text: Text content of the chunk
        chunk_type: Type of chunk (opening_statement, viewpoint)
        
    Returns:
        ChunkFeedbackStructured: Structured feedback object
    """
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set")
    
    # Create client
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    
    # Download audio with extended timeout
    timeout = httpx.Timeout(60.0, connect=10.0)  # 60s read, 10s connect
    async with httpx.AsyncClient(timeout=timeout) as http_client:
        response = await http_client.get(chunk_audio_url)
        response.raise_for_status()
        audio_bytes = response.content
    
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_file:
        temp_file.write(audio_bytes)
        temp_path = temp_file.name
    
    try:
        audio_file = client.files.upload(
            file=temp_path,
            config=types.UploadFileConfig(mimeType="audio/mpeg")
        )
        
        # Chunk-type-specific analysis guidance
        type_prompts = {
            "opening_statement": """分析这段开头语：
- 发音错误：识别0-5个最严重的发音问题（如果没有发音错误就返回空数组）
- 语法错误：找出语法问题并提供纠正
- 表达优化：建议更地道、更学术的表达方式（例如："good" → "beneficial"）
- 流利度：评价停顿、语速、犹豫
- 内容：thesis陈述是否明确
- 优点：肯定做得好的地方
- 可操作建议：给出具体改进建议""",
            "viewpoint": """分析这段观点阐述：
- 发音错误：识别0-5个最严重的发音问题（如果没有发音错误就返回空数组）
- 语法错误：找出语法问题并提供纠正
- 表达优化：建议更地道、更学术的表达方式
- 流利度：评价停顿、语速、犹豫
- 内容：论证逻辑、细节支撑是否充分
- 优点：肯定做得好的地方
- 可操作建议：给出具体改进建议"""
        }
        
        prompt = f"""你是托福口语评分专家。请仔细听音频，用中文分析这段{chunk_type}。

参考转录文本：{chunk_text}

分析要求：
{type_prompts.get(chunk_type, "分析这段内容的表现")}

请完成以下分析（按优先级）：

1. **发音分析（非常重要！）**：
   - 仔细听音频，识别发音不清晰、不准确或有口音影响的单词
   - 注意：即使是轻微的发音问题也要指出（如重音位置、元音发音、辅音发音）
   - 对于中国学生，特别注意：th/s/z音、r/l音、v/w音、重音位置等常见问题
   - 返回1-5个最需要改进的发音问题（如果发音较好，也要至少指出1-2个可以更完美的地方）
   - 每个问题包含：单词、学生的发音（拼音或近似音标）、正确发音（IPA音标）、具体发音技巧

2. **语法分析**：找出语法错误，提供纠正版本和详细解释

3. **表达优化**：找出可以改进的表达，提供更地道、更学术的版本

4. **流利度评价**：评价语速、停顿、犹豫、连读情况

5. **内容逻辑**：评价论证的相关性和逻辑性

6. **优点强化**：肯定学生做得好的地方（正面反馈很重要！）

7. **可操作建议**：针对上述问题，提供3-5条具体的、可操作的改进建议

重要提示：
- 所有文字内容必须用中文
- **pronunciation_issues 不要返回空数组！** 即使发音整体不错，也要指出可以改进的地方
- 发音分析要基于实际听到的音频，不仅仅是看文本
- 提供具体的例子和建议，不要泛泛而谈
- 音标要准确（使用IPA国际音标）"""
        
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
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
                        "summary": {
                            "type": "string",
                            "description": "2-3 sentence summary in Chinese"
                        },
                        "pronunciation_issues": {
                            "type": "array",
                            "maxItems": 5,
                            "description": "1-5 pronunciation issues to improve. Even if pronunciation is good, suggest 1-2 areas for refinement. Focus on: stress, intonation, specific sounds (th, r, l, v, etc). DO NOT return empty array unless pronunciation is absolutely perfect.",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "word": {"type": "string"},
                                    "your_pronunciation": {"type": "string"},
                                    "correct_pronunciation": {"type": "string"},
                                    "tip": {"type": "string"},
                                    "timestamp": {"type": "number"}
                                },
                                "required": ["word", "correct_pronunciation", "tip"]
                            }
                        },
                        "pronunciation_score": {
                            "type": "integer",
                            "minimum": 0,
                            "maximum": 10,
                            "description": "Pronunciation score 0-10"
                        },
                        "grammar_issues": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "original": {"type": "string"},
                                    "corrected": {"type": "string"},
                                    "explanation": {"type": "string"},
                                    "error_type": {"type": "string"}
                                },
                                "required": ["original", "corrected", "explanation", "error_type"]
                            }
                        },
                        "expression_suggestions": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "original": {"type": "string"},
                                    "improved": {"type": "string"},
                                    "reason": {"type": "string"}
                                },
                                "required": ["original", "improved", "reason"]
                            }
                        },
                        "fluency_notes": {
                            "type": "string",
                            "description": "Comments on pace, pauses, hesitations in Chinese"
                        },
                        "content_notes": {
                            "type": "string",
                            "description": "Comments on logic, relevance, detail support in Chinese"
                        },
                        "actionable_tips": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "category": {"type": "string"},
                                    "tip": {"type": "string"}
                                },
                                "required": ["category", "tip"]
                            }
                        },
                        "strengths": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "What the student did well (in Chinese)"
                        }
                    },
                    "required": ["summary"]
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
    
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    # Format transcript with timestamps
    formatted_segments = "\n".join([
        f"[{seg['start']:.2f}-{seg['end']:.2f}] {seg['text']}"
        for seg in transcript_data['segments']
    ])
    
    response = await client.chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": """分析独立口语转录，识别内容结构：

规则：
1. 第一块必须是 opening_statement（开头语）
2. 后续是观点和支持细节，chunk_type为 viewpoint
3. 根据内容逻辑动态确定分块数量（通常2-4块）

返回JSON格式：
{
  "chunks": [
    {"chunk_id": 0, "chunk_type": "opening_statement", "start": 0.0, "end": 5.2, "text": "完整文本"},
    {"chunk_id": 1, "chunk_type": "viewpoint", "start": 5.2, "end": 22.1, "text": "完整文本"}
  ]
}

每个chunk的text字段必须包含该时间段内的完整文本内容。"""
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
    
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    # Download MP3 audio (already converted at upload time)
    async with httpx.AsyncClient() as http_client:
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
                        "text": f"""托福口语评分专家，分析录音并评分。

问题：{question_text}

评分标准（各0-10分）：
1. Delivery: 发音、流利度、语调
2. Language Use: 语法、词汇、句式
3. Topic Development: 内容相关性、逻辑

输出格式（中文markdown）：

## 整体评分
- Delivery: X/10
- Language Use: X/10
- Topic Development: X/10

## 整体评价
2-3句总结

## 详细分析
具体分析"""
                    }
                ]
            }
        ]
    )
    
    return completion.choices[0].message.content


async def analyze_chunk_audio(
    chunk_audio_url: str,
    chunk_text: str,
    chunk_type: str
) -> str:
    """
    Analyze individual chunk audio using Audio GPT.
    Returns comprehensive feedback (delivery + content + grammar).
    
    Args:
        chunk_audio_url: Presigned URL to chunk audio
        chunk_text: Text content of the chunk
        chunk_type: Type of chunk (opening_statement, viewpoint)
        
    Returns:
        str: Markdown text with comprehensive feedback
    """
    if not settings.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not set")
    
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    # Download chunk audio
    async with httpx.AsyncClient() as http_client:
        response = await http_client.get(chunk_audio_url)
        response.raise_for_status()
        audio_bytes = response.content
    
    # Chunk audio is already mp3 (from pydub export), so just encode
    audio_base64 = base64.b64encode(audio_bytes).decode()
    
    # Chunk-specific analysis guidance
    type_prompts = {
        "opening_statement": """分析这段开头语：
- 发音错误：识别1-5个最严重的发音问题（如果没有就说明发音很好）
- 语法错误：找出语法问题并提供纠正
- 表达优化：建议更地道、更学术的表达方式
- 流利度：评价停顿、语速、犹豫
- 内容：thesis陈述是否明确
- 优点：肯定做得好的地方
- 可操作建议：给出具体改进建议""",
        "viewpoint": """分析这段观点阐述：
- 发音错误：识别1-5个最严重的发音问题（如果没有就说明发音很好）
- 语法错误：找出语法问题并提供纠正
- 表达优化：建议更地道、更学术的表达方式
- 流利度：评价停顿、语速、犹豫
- 内容：论证逻辑、细节支撑是否充分
- 优点：肯定做得好的地方
- 可操作建议：给出具体改进建议"""
    }
    
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
                        "text": f"""你是托福口语评分专家。请仔细听音频，用中文分析这段{chunk_type}。

参考转录文本：{chunk_text}

{type_prompts.get(chunk_type, "分析这段内容的表现")}

请按以下结构输出（中文markdown格式）：

## 整体评价
2-3句话总结这段内容的表现

## 发音分析
列出发音问题（如果有）：
- 单词：[错误单词]
  - 你的发音：[学生发音]
  - 正确发音：[IPA音标]
  - 技巧：[具体发音建议]

## 语法问题
列出语法错误（如果有）：
- 原句：[错误句子]
- 纠正：[正确句子]
- 解释：[为什么错误，语法规则]
- 类型：[错误类型，如时态、主谓一致等]

## 表达建议
列出可以改进的表达（如果有）：
- 原表达：[学生的表达]
- 改进：[更好的表达]
- 原因：[为什么更好]

## 流利度评价
评价语速、停顿、犹豫情况

## 内容评价
评价逻辑、相关性、细节支撑

## 优点
列出做得好的地方（至少1-2点）

## 改进建议
给出3-5条具体的、可操作的改进建议，每条标注类别（发音/语法/词汇/结构/流利度）

重要：所有内容必须用中文！"""
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
    
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    # Step 1: LLM extracts component scores
    completion = await client.beta.chat.completions.parse(
        model="gpt-4o-2024-08-06",
        messages=[
            {
                "role": "system",
                "content": "从评价文本中提取三项分数（各0-10分）和文字评价。"
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
    total_score = (
        llm_result.delivery + 
        llm_result.language_use + 
        llm_result.topic_development
    )
    
    if total_score >= 24:
        level = "Excellent"
    elif total_score >= 18:
        level = "Good"
    elif total_score >= 14:
        level = "Fair"
    else:
        level = "Weak"
    
    # Step 3: Build final GlobalEvaluation
    return GlobalEvaluation(
        total_score=total_score,
        score_breakdown={
            "delivery": llm_result.delivery,
            "language_use": llm_result.language_use,
            "topic_development": llm_result.topic_development
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
    
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    # Parse markdown into structured format
    completion = await client.beta.chat.completions.parse(
        model="gpt-4o-2024-08-06",
        messages=[
            {
                "role": "system",
                "content": """从音频分析的markdown文本中提取结构化反馈。

要求：
1. 识别发音问题（pronunciation_issues）：单词、学生发音、正确发音、技巧
2. 识别语法错误（grammar_issues）：原句、纠正、解释、错误类型
3. 表达建议（expression_suggestions）：原表达、改进表达、原因
4. 流利度评价（fluency_notes）：语速、停顿、犹豫
5. 内容评价（content_notes）：逻辑、相关性、细节
6. 可操作建议（actionable_tips）：分类和具体建议
7. 优点（strengths）：做得好的地方

所有内容必须用中文。如果某个字段在原文中没有明确信息，可以返回空数组或null。"""
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
    chunk_audio_url: str,
    chunk_text: str,
    chunk_type: str
) -> ChunkFeedbackStructured:
    """
    Unified interface for chunk audio analysis with provider selection and fallback.
    
    Args:
        chunk_audio_url: Presigned URL to chunk audio
        chunk_text: Text content of the chunk
        chunk_type: Type of chunk (opening_statement, viewpoint)
        
    Returns:
        ChunkFeedbackStructured: Structured feedback object
    """
    provider = _get_audio_provider()
    
    if provider == "gemini":
        try:
            return await analyze_chunk_audio_gemini(chunk_audio_url, chunk_text, chunk_type)
        except Exception as e:
            if settings.OPENAI_API_KEY:
                print(f"Gemini chunk analysis failed: {e}. Falling back to OpenAI.")
                # Fallback to OpenAI two-step process
                feedback_text = await analyze_chunk_audio(chunk_audio_url, chunk_text, chunk_type)
                return await parse_chunk_feedback_to_json(feedback_text, chunk_text, chunk_type)
            else:
                raise Exception(f"Gemini chunk analysis failed: {e}")
    else:  # openai
        # Step 1: Audio analysis (markdown)
        feedback_text = await analyze_chunk_audio(chunk_audio_url, chunk_text, chunk_type)
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
