"""LLM service using Volcengine Doubao and OpenAI GPT-4o for multimodal analysis."""

import httpx
from app.config import settings
from pydantic import BaseModel, Field
from openai import AsyncOpenAI


# --- OpenAI Structured Output Models ---

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


async def generate_report_openai(transcript_data: dict, question_text: str) -> ToeflReportFinal:
    """
    Generate analysis report using OpenAI GPT-4o (Structured Outputs).
    
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
