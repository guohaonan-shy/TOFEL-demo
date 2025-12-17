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

export interface SentenceAnalysis {
  original_text: string;
  evaluation: string;  // "✅ 优秀" | "⚡ 可改进" | "⚠️ 需修正"
  native_version: string | null;
  grammar_feedback: string;
  expression_feedback: string;
  suggestion_feedback: string;
  start_time: number;
  end_time: number;
}

export interface ReportJSON {
  delivery_score: number;      // 0-10
  delivery_comment: string;
  language_score: number;       // 0-10
  language_comment: string;
  topic_score: number;          // 0-10
  topic_comment: string;
  total_score: number;          // 0-30
  level: string;                // "Excellent" | "Good" | "Fair" | "Weak"
  overall_summary: string;
  sentence_analyses: SentenceAnalysis[];
  actionable_tips: string[];
}

export interface AnalysisStatusResponse {
  task_id: number;
  status: string;
  step?: string | null;
}

export interface AnalysisResponse {
  task_id: number;
  status: string;
  report_markdown: string | null;  // Deprecated, ignore
  report_json: ReportJSON | null;
  error_message: string | null;
  created_at: string;
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

