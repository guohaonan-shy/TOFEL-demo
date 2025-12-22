/**
 * API Client for TOEFL Speaking Backend
 * Base URL configured via environment variable
 */

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export interface Question {
  question_id: string;
  instruction: string;
  audio_url: string;
  sos_keywords: string[];
  sos_starter: string;
  created_at: string;
}

export interface QuestionsResponse {
  questions: Question[];
  total: number;
}

export interface RecordingResponse {
  id: number;
  question_id: string;
  audio_url: string;
  created_at: string;
}

// V2 Interfaces for chunk-based analysis
export interface GlobalEvaluation {
  total_score: number;  // 0-30 scale
  score_breakdown: {
    delivery: number;  // 0-4.0 scale (TOEFL official)
    language_use: number;  // 0-4.0 scale (TOEFL official)
    topic_development: number;  // 0-4.0 scale (TOEFL official)
  };
  level: string;
  overall_summary: string;
  detailed_feedback: string;
}

export interface FullTranscript {
  text: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

// Structured Feedback Interfaces
export interface PronunciationIssue {
  word: string;
  your_pronunciation?: string;
  correct_pronunciation: string;
  tip: string;
  timestamp?: number;
}

export interface GrammarIssue {
  original: string;
  corrected: string;
  explanation: string;
  error_type: string;
}

export interface ExpressionSuggestion {
  original: string;
  improved: string;
  reason: string;
}

export interface ActionableTip {
  category: string;
  tip: string;
}

export interface ChunkFeedbackStructured {
  summary: string;
  pronunciation_issues: PronunciationIssue[];
  pronunciation_score?: number;
  grammar_issues: GrammarIssue[];
  expression_suggestions: ExpressionSuggestion[];
  fluency_notes?: string;
  content_notes?: string;
  actionable_tips: ActionableTip[];
  strengths: string[];
}

export interface ChunkAnalysis {
  chunk_id: number;
  chunk_type: string;  // "opening_statement" | "viewpoint"
  time_range: [number, number];  // [start, end] in seconds for frontend playback
  text: string;
  feedback_structured: ChunkFeedbackStructured;
}

export interface ReportJSONV2 {
  analysis_version: string;
  global_evaluation: GlobalEvaluation;
  full_transcript: FullTranscript;
  chunks: ChunkAnalysis[];
}

// Legacy V1 interfaces (kept for backward compatibility)
export interface DeliveryAnalysis {
  overall_score: number;
  fluency_comment: string;
  pronunciation_comment: string;
  intonation_comment: string;
  pace_comment: string;
  confidence_comment: string;
}

export interface SentenceAnalysis {
  original_text: string;
  start_time: number;
  end_time: number;
  
  // Text-based analysis
  evaluation: string;  // "优秀" | "可改进" | "需修正"
  grammar_feedback: string;
  expression_feedback: string;
  suggestion_feedback: string;
  native_version: string | null;
  
  // Audio-based analysis (NEW)
  pronunciation_score: number;  // 0-10
  pronunciation_feedback: string | null;
}

export interface ReportJSONV1 {
  // Delivery (from audio)
  delivery_analysis: DeliveryAnalysis;  // NEW: Detailed delivery analysis
  delivery_score: number;      // 0-10
  
  // Language (from text)
  language_score: number;       // 0-10
  language_comment: string;
  
  // Topic (from text)
  topic_score: number;          // 0-10
  topic_comment: string;
  
  // Overall
  total_score: number;          // 0-30
  level: string;                // "Excellent" | "Good" | "Fair" | "Weak"
  overall_summary: string;
  
  // Sentence-by-sentence
  sentence_analyses: SentenceAnalysis[];
  
  // Tips
  actionable_tips: string[];
}

// Union type for both versions
export type ReportJSON = ReportJSONV2 | ReportJSONV1;

export interface AnalysisStatusResponse {
  task_id: number;
  status: string;
  step?: string | null;
}

// SSE Event Types
export type SSEStepType = 'uploading' | 'transcribing' | 'analyzing' | 'generating';
export type SSEStepStatus = 'start' | 'completed';

export interface SSEStepEvent {
  type: SSEStepType;
  status: SSEStepStatus;
}

export interface SSECompletedEvent {
  type: 'completed';
  report: ReportJSONV2;
  recording_id: number;
  audio_url: string;
}

export interface SSEErrorEvent {
  type: 'error';
  message: string;
  step?: string;
}

export type SSEEvent = SSEStepEvent | SSECompletedEvent | SSEErrorEvent;

export interface AnalysisResponse {
  task_id: number;
  status: string;
  report_markdown: string | null;  // Deprecated, ignore
  report_json: ReportJSON | null;  // Can be V1 or V2
  error_message: string | null;
  created_at: string;
}

/**
 * Helper function to check if report is V2
 */
export function isReportV2(report: ReportJSON): report is ReportJSONV2 {
  return (report as ReportJSONV2).analysis_version === "2.0";
}

/**
 * Fetch all available TOEFL questions
 */
export async function fetchQuestions(): Promise<QuestionsResponse> {
  const response = await fetch(`${API_BASE_URL}/questions`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch questions: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Fetch a specific question by ID
 * @param questionId - The ID of the question to fetch
 */
export async function fetchQuestion(questionId: string): Promise<Question> {
  const response = await fetch(`${API_BASE_URL}/questions/${questionId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch question: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Upload a recording to the backend
 * @param audioBlob - The recorded audio as a Blob
 * @param questionId - The ID of the question being answered
 */
export async function uploadRecording(
  audioBlob: Blob,
  questionId: string
): Promise<RecordingResponse> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  formData.append('question_id', questionId);
  
  const response = await fetch(`${API_BASE_URL}/recordings`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to upload recording: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Start AI analysis for a recording
 * @param recordingId - The ID of the uploaded recording
 */
export async function startAnalysis(recordingId: number): Promise<AnalysisStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recording_id: recordingId }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to start analysis: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get the result of an analysis task
 * @param taskId - The ID of the analysis task
 */
export async function getAnalysisResult(taskId: number): Promise<AnalysisResponse> {
  const response = await fetch(`${API_BASE_URL}/analysis/${taskId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to get analysis result: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Recording report response interface
 */
export interface RecordingReportResponse {
  recording_id: number;
  question_id: string;
  audio_url: string;
  report: ReportJSONV2 | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

/**
 * Get recording report by recording ID
 * Returns the analysis report and presigned audio URL
 * @param recordingId - The ID of the recording
 */
export async function getRecordingReport(recordingId: number): Promise<RecordingReportResponse> {
  const response = await fetch(`${API_BASE_URL}/recordings/${recordingId}/report`);
  
  if (!response.ok) {
    throw new Error(`Failed to get recording report: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Submit audio for AI analysis with SSE streaming progress
 * @param audioBlob - The recorded audio as a Blob
 * @param questionId - The ID of the question being answered
 * @param onEvent - Callback for each SSE event
 */
export async function submitAnalysisWithSSE(
  audioBlob: Blob,
  questionId: string,
  onEvent: (event: SSEEvent) => void
): Promise<void> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  formData.append('question_id', questionId);
  
  const response = await fetch(`${API_BASE_URL}/analysis`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to start analysis: ${response.statusText}`);
  }
  
  if (!response.body) {
    throw new Error('No response body for SSE stream');
  }
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    
    if (done) {
      break;
    }
    
    buffer += decoder.decode(value, { stream: true });
    
    // Parse SSE events from buffer
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';  // Keep incomplete line in buffer
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.slice(6).trim();
        if (jsonStr) {
          try {
            const event = JSON.parse(jsonStr) as SSEEvent;
            onEvent(event);
          } catch (e) {
            console.error('Failed to parse SSE event:', jsonStr, e);
          }
        }
      }
    }
  }
}

