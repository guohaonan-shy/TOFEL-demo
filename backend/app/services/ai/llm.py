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


# --- V2 Schemas for Content-Aware Chunking ---

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
    feedback: str = Field(..., description="Comprehensive feedback from Audio GPT")


class ToeflReportV2(BaseModel):
    """Complete analysis report v2."""
    analysis_version: str = "2.0"
    global_evaluation: GlobalEvaluation
    full_transcript: FullTranscript
    chunks: list[ChunkInfo]


# --- OLD V1 Schemas (DEPRECATED - kept for reference only) ---
# These schemas are no longer used. The new V2 workflow uses content-aware chunking
# instead of sentence-by-sentence analysis.

class SentenceAnalysis(BaseModel):
    original_text: str = Field(..., description="The original sentence from transcript")
    evaluation: str = Field(..., description="Evaluation status, e.g. '优秀' or '可改进'")
    native_version: str | None = Field(None, description="Native speaker rewrite (if needed)")
    grammar_feedback: str = Field(..., description="Grammar feedback")
    expression_feedback: str = Field(..., description="Expression/Vocabulary feedback")
    suggestion_feedback: str = Field(..., description="General suggestions")
    start_time: float = Field(..., description="Start time of sentence in seconds")
    end_time: float = Field(..., description="End time of sentence in seconds")

class ToeflReportLLM(BaseModel):
    """Raw output from LLM."""
    delivery_score: int = Field(..., description="Score 0-10")
    delivery_comment: str = Field(..., description="Brief comment on delivery")
    language_score: int = Field(..., description="Score 0-10")
    language_comment: str = Field(..., description="Brief comment on language use")
    topic_score: int = Field(..., description="Score 0-10")
    topic_comment: str = Field(..., description="Brief comment on topic development")
    
    overall_summary: str = Field(..., description="2-sentence overall summary")
    sentence_analyses: list[SentenceAnalysis]
    actionable_tips: list[str] = Field(..., description="List of 3 specific actionable tips")

class ToeflReportFinal(ToeflReportLLM):
    """Final report with calculated scores."""
    total_score: int
    level: str


# DEPRECATED: Old sentence-by-sentence scoring prompt
# The new V2 workflow uses audio-first analysis with content-aware chunking
SCORING_SYSTEM_PROMPT = """
You are an expert TOEFL Speaking rater. Analyze the student's response.

**Inputs provided:**
1. Question Topic
2. Transcript with timestamps

**Your Task:**
1. Use Chinese for all comments and summaries.
2. Rate 3 dimensions (Delivery, Language, Topic) on a scale of 0-10.
3. Provide a brief summary.
4. Go through the transcript sentence-by-sentence.
   - For "evaluation", use exactly "优秀" for good sentences, or "可改进" / "需修正" for issues.
   - Provide specific feedback for Grammar, Expression, and Suggestions.
   - If improvement is needed, provide a "native_version".
   - IMPORTANT: Use the provided timestamps for start_time/end_time.

**Output Format:**
Return ONLY valid JSON matching the schema.
"""


# DEPRECATED: Old sentence-by-sentence analysis function
# Use the new V2 workflow functions instead (chunk_transcript_by_content, analyze_full_audio, etc.)
async def generate_report_openai(transcript_data: dict, question_text: str) -> ToeflReportFinal:
    """
    DEPRECATED: Generate analysis report using OpenAI GPT-4o (Structured Outputs).
    
    This function is kept for backward compatibility but should not be used in new code.
    Use the V2 workflow instead.
    
    Args:
        transcript_data: Dict containing 'text' and 'segments' (with timestamps)
        question_text: The question prompt
        
    Returns:
        ToeflReportFinal: The structured analysis report with calculated scores
    """
    if not settings.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not set")
        
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    # Prepare the user prompt with transcript and timestamps
    formatted_transcript = "\n".join([
        f"[{seg['start']:.2f}-{seg['end']:.2f}] {seg['text']}" 
        for seg in transcript_data['segments']
    ])
    
    completion = await client.beta.chat.completions.parse(
        model="gpt-4o-2024-08-06",
        messages=[
            {"role": "system", "content": SCORING_SYSTEM_PROMPT},
            {"role": "user", "content": f"Question: {question_text}\n\nTranscript:\n{formatted_transcript}"}
        ],
        response_format=ToeflReportLLM
    )
    
    llm_result = completion.choices[0].message.parsed
    
    # Python Logic: Calculate Total Score and Level
    total_score = (
        llm_result.delivery_score + 
        llm_result.language_score + 
        llm_result.topic_score
    )
    
    if total_score >= 26:
        level = "Excellent"
    elif total_score >= 18:
        level = "Good"
    elif total_score >= 14:
        level = "Fair"
    else:
        level = "Weak"
        
    # Construct Final Report
    final_report = ToeflReportFinal(
        **llm_result.model_dump(),
        total_score=total_score,
        level=level
    )
    
    return final_report


# --- V2 Functions for Content-Aware Chunking ---

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
        audio_url: Presigned URL to the audio file
        question_text: The TOEFL question
        
    Returns:
        str: Markdown text with scores and analysis
    """
    if not settings.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not set")
    
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    # Download audio
    async with httpx.AsyncClient() as http_client:
        response = await http_client.get(audio_url)
        response.raise_for_status()
        audio_bytes = response.content
    
    # Convert to mp3 if needed (OpenAI requires mp3 format)
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as temp_input:
        temp_input.write(audio_bytes)
        temp_input_path = temp_input.name
    
    temp_output_path = None
    try:
        # Load audio and convert to mp3
        audio = AudioSegment.from_file(temp_input_path)
        
        # Export as mp3
        temp_output_path = temp_input_path.replace('.webm', '.mp3')
        audio.export(temp_output_path, format="mp3")
        
        # Read mp3 file and encode to base64
        with open(temp_output_path, 'rb') as mp3_file:
            audio_base64 = base64.b64encode(mp3_file.read()).decode()
    finally:
        # Cleanup temp files
        if os.path.exists(temp_input_path):
            os.remove(temp_input_path)
        if temp_output_path and os.path.exists(temp_output_path):
            os.remove(temp_output_path)
    
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
    
    # Chunk-specific prompts
    type_prompts = {
        "opening_statement": "分析开头语：发音、thesis明确度、语法、词汇、建议",
        "viewpoint": "分析观点：流利度、逻辑、细节、语法、词汇、建议"
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
                        "text": f"""托福教练，分析{chunk_type}。

参考文本：{chunk_text}

{type_prompts.get(chunk_type, "分析这段内容")}

中文markdown输出。"""
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
