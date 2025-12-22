import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useParams, useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, AlertCircle, ChevronUp } from 'lucide-react';

// Auth
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AuthPage } from './pages';

// API and Hooks
import { 
  fetchQuestion, 
  submitAnalysisWithSSE,
  getRecordingReport,
  type Question, 
  type AnalysisResponse,
  type SSEEvent,
  type ReportJSONV2
} from '../services/api';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useQuestionAudio } from '../hooks/useQuestionAudio';

// Default question ID for initial load
const DEFAULT_QUESTION_ID = 'question_01KCH9WP8W6TZXA5QXS1BFF6AS';

// Valid steps for URL routing
const VALID_STEPS = ['detail', 'practice', 'confirmation', 'analyzing', 'report'] as const;
type StepType = typeof VALID_STEPS[number];

// Practice phases (internal to practice page)
type PracticePhase = 'listening' | 'preparing' | 'recording';

// Development mode - skip microphone permission check for UI debugging
// Auto-detect: skip if getUserMedia is not available (e.g., Cursor Visual Editor, some webviews)
const isMediaDevicesSupported = typeof navigator !== 'undefined' 
  && navigator.mediaDevices 
  && typeof navigator.mediaDevices.getUserMedia === 'function';

// Dev mode: skip mic check for UI debugging in Visual Editor
// Can be enabled via: VITE_DEV_SKIP_MIC=true npm run dev
const DEV_FORCE_SKIP_MIC = import.meta.env.VITE_DEV_SKIP_MIC === 'true';
const DEV_SKIP_MIC_CHECK = DEV_FORCE_SKIP_MIC || !isMediaDevicesSupported;

// Layout Components
import { Sidebar } from './components/layout/Sidebar';

// Page Components
import { 
  DetailPage, 
  PracticePage, 
  ConfirmationPage, 
  AnalyzingPage, 
  ReportPage,
  type AnalysisStep 
} from './pages';

// Question Practice Page - handles all steps for a specific question
const QuestionPage = () => {
  // Get question ID and step from URL path
  const { questionId, step } = useParams<{ questionId: string; step?: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Map URL step to internal step type
  const getStepFromUrl = (): StepType => {
    if (!step) return 'detail';
    if (VALID_STEPS.includes(step as StepType)) return step as StepType;
    return 'detail';
  };

  // Core Steps: 'detail' -> 'practice' -> 'confirmation' -> 'analyzing' -> 'report'
  const [currentStep, setCurrentStep] = useState<StepType>(getStepFromUrl);
  
  // Practice phase (internal to practice step): 'listening' -> 'preparing' -> 'recording'
  const [practicePhase, setPracticePhase] = useState<PracticePhase>('listening');
  
  // Recording ID and Audio URL (for report page persistence)
  // Recording ID is now ULID format (e.g., recording_01HGW2BBG4BV9DG8YCEXFZR8ND)
  const DEV_DEFAULT_RECORDING_ID = 'recording_dev_placeholder';
  const [recordingId, setRecordingId] = useState<string | null>(() => {
    const id = searchParams.get('recording_id');
    if (id) return id;  // Already a string (ULID format)
    // In dev mode on report page, use default recording_id for debugging
    if (DEV_SKIP_MIC_CHECK && getStepFromUrl() === 'report') {
      return DEV_DEFAULT_RECORDING_ID;
    }
    return null;
  });
  const [serverAudioUrl, setServerAudioUrl] = useState<string | null>(null);
  
  // Navigate to new step via URL (preserves recording_id when navigating to report)
  const navigateToStep = (newStep: StepType, newRecordingId?: string) => {
    setCurrentStep(newStep);
    if (newStep === 'detail') {
      navigate(`/questions/${questionId}`);
    } else if (newStep === 'report' && (newRecordingId || recordingId)) {
      // Include recording_id in URL for report page persistence
      const rid = newRecordingId || recordingId;
      navigate(`/questions/${questionId}/${newStep}?recording_id=${rid}`);
    } else {
      navigate(`/questions/${questionId}/${newStep}`);
    }
  }; 
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(15);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // UI Interaction State
  const [isSOSOpen, setIsSOSOpen] = useState(false);
  const [audioBars, setAudioBars] = useState(new Array(30).fill(10));
  
  // Audio Player State (P4 & P5)
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(45); // Actual recording duration
  const recordingPlayerRef = useRef<HTMLAudioElement | null>(null);
  
  // In dev mode, don't use mock audio - serverAudioUrl will be fetched from API
  const recordingBlobUrlRef = useRef<string | null>(null);
  
  // P4.5 Analysis Progress State - AI Tutor style labels
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([
    { id: 1, label: 'Response received securely', status: 'pending' },
    { id: 2, label: 'Listening for every word', status: 'pending' },
    { id: 3, label: 'AI Deep Analysis', status: 'pending' },
    { id: 4, label: 'Generating score & personalized tips', status: 'pending' }
  ]);
  
  // Map SSE step type to step ID
  const stepTypeToId: Record<string, number> = {
    'uploading': 1,
    'transcribing': 2,
    'analyzing': 3,
    'generating': 4
  };
  
  // P5 Report State
  const [expandedSentenceId, setExpandedSentenceId] = useState<number | null>(null);

  // Backend Integration State
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  
  // In dev mode, don't use mock report - let useEffect fetch real data from API using DEV_DEFAULT_RECORDING_ID
  // This allows testing the full report page with real data from database
  const [analysisReport, setAnalysisReport] = useState<AnalysisResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Microphone Permission State
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  
  // Audio Recorder Hook
  const audioRecorder = useAudioRecorder();
  
  // Question Audio Hook (for playing question audio and beeps)
  const questionAudio = useQuestionAudio();

  // ---------------- Logic Controllers ----------------

  // P1: Fetch question on Mount and cache audio
  useEffect(() => {
    if (!questionId) return;
    const loadQuestion = async () => {
      setIsLoadingQuestion(true);
      setApiError(null);
      try {
        const question = await fetchQuestion(questionId);
        setCurrentQuestion(question);
        
        // Pre-load and cache the question audio
        if (question.audio_url) {
          await questionAudio.loadAudio(question.audio_url);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load question';
        setApiError(message);
        console.error('Error fetching question:', error);
      } finally {
        setIsLoadingQuestion(false);
      }
    };
    loadQuestion();
  }, [questionId]);

  // P2: Fetch report when refreshing report page with recording_id
  // In dev mode, uses DEV_DEFAULT_RECORDING_ID if no URL param is present
  useEffect(() => {
    const urlRecordingId = searchParams.get('recording_id');
    const effectiveRecordingId = urlRecordingId || recordingId;  // Already string (ULID format)
    
    if (currentStep === 'report' && effectiveRecordingId && !analysisReport) {
      console.log('[useEffect] Fetching report for recording_id:', effectiveRecordingId);
      
      const fetchReport = async () => {
        try {
          const reportData = await getRecordingReport(effectiveRecordingId);
          
          if (reportData.status === 'completed' && reportData.report) {
            setRecordingId(effectiveRecordingId);
            setServerAudioUrl(reportData.audio_url);
            setAnalysisReport({
              task_id: 0,  // Not used, just a placeholder
              status: 'completed',
              report_markdown: null,
              report_json: reportData.report,
              error_message: null,
              created_at: reportData.created_at
            });
          } else if (reportData.status === 'failed') {
            setApiError(reportData.error_message || 'Analysis failed');
          } else {
            // Still processing, show loading state
            console.log('Report still processing:', reportData.status);
          }
        } catch (error) {
          console.error('Failed to fetch report:', error);
          setApiError('Failed to load report. Please try again.');
        }
      };
      
      fetchReport();
    }
  }, [currentStep, searchParams, analysisReport, recordingId]);

  // Pre-warm microphone when countdown is about to end (5 seconds left)
  useEffect(() => {
    if (currentStep === 'practice' && practicePhase === 'preparing' && timeLeft === 5 && !DEV_SKIP_MIC_CHECK) {
      console.log('Pre-warming microphone for recording...');
      audioRecorder.warmup();
    }
  }, [currentStep, practicePhase, timeLeft]);

  // Countdown Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTimerRunning && !isPaused && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      handleTimerComplete();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, isPaused, timeLeft]);

  // Recording Waveform Animation - use ref to access latest audioLevel without re-triggering effect
  const audioLevelRef = useRef(audioRecorder.audioLevel);
  audioLevelRef.current = audioRecorder.audioLevel;

  useEffect(() => {
    const isRecordingPhase = currentStep === 'practice' && practicePhase === 'recording';
    if (isRecordingPhase && isTimerRunning && !isPaused && audioRecorder.isRecording) {
      const updateBars = () => {
        // Read from ref to get latest value without dependency issues
        const baseLevel = audioLevelRef.current;
        setAudioBars(prev => prev.map(() => {
          // Add more variation based on audio level
          const variation = Math.random() * 30 * (1 + baseLevel / 50);
          return Math.max(8, 10 + baseLevel / 2 + variation);
        }));
      };
      const barInterval = setInterval(updateBars, 80);
      return () => clearInterval(barInterval);
    } else if (!isRecordingPhase || isPaused) {
      setAudioBars(new Array(30).fill(10));
    }
  }, [currentStep, practicePhase, isTimerRunning, isPaused, audioRecorder.isRecording]);

  // Cleanup recording player on unmount or when leaving confirmation page
  useEffect(() => {
    return () => {
      if (recordingPlayerRef.current) {
        recordingPlayerRef.current.pause();
        recordingPlayerRef.current = null;
      }
      if (recordingBlobUrlRef.current) {
        URL.revokeObjectURL(recordingBlobUrlRef.current);
        recordingBlobUrlRef.current = null;
      }
    };
  }, []);

  // SSE Event Handler for analysis progress
  const handleSSEEvent = (event: SSEEvent) => {
    if (event.type === 'completed') {
      // All steps completed, set report and navigate
      setAnalysisSteps(prev => prev.map(s => ({ ...s, status: 'completed' })));
      setAnalysisReport({
        task_id: 0,
        status: 'completed',
        report_markdown: null,
        report_json: event.report,
        error_message: null,
        created_at: new Date().toISOString()
      });
      
      // Save recording_id and audio_url from server
      setRecordingId(event.recording_id);
      setServerAudioUrl(event.audio_url);
      
      setTimeout(() => navigateToStep('report', event.recording_id), 800);
    } else if (event.type === 'error') {
      setApiError(event.message);
      navigateToStep('confirmation');
    } else {
      // Step event (uploading, transcribing, analyzing, generating)
      const stepId = stepTypeToId[event.type];
      if (stepId) {
        if (event.status === 'start') {
          // Set this step to processing
          setAnalysisSteps(prev => prev.map(s => 
            s.id === stepId ? { ...s, status: 'processing' } : s
          ));
        } else if (event.status === 'completed') {
          // Set this step to completed
          setAnalysisSteps(prev => prev.map(s => 
            s.id === stepId ? { ...s, status: 'completed' } : s
          ));
        }
      }
    }
  };

  const handleTimerComplete = async () => {
    if (currentStep === 'practice' && practicePhase === 'preparing') {
      // Play beep before starting recording
      await questionAudio.playBeep();
      startRecordingPhase();
    } else if (currentStep === 'practice' && practicePhase === 'recording') {
      finishRecording();
    }
  };

  // ---------------- Actions ----------------

  // Request microphone permission before starting practice
  const requestMicrophonePermission = async (): Promise<boolean> => {
    // Skip permission check in dev mode (for UI debugging in Visual Editor)
    if (DEV_SKIP_MIC_CHECK) {
      console.warn('[DEV MODE] Skipping microphone permission check');
      setMicPermission('granted');
      return true;
    }
    
    try {
      // Check current permission status using Permissions API if available
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setMicPermission(result.state as 'granted' | 'denied' | 'prompt');
        
        if (result.state === 'denied') {
          setApiError('麦克风权限已被拒绝。请在浏览器设置中允许麦克风访问，然后刷新页面重试。');
          return false;
        }
      }
      
      // Request microphone access to trigger browser permission prompt
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Permission granted - stop the stream immediately (we'll start recording later)
      stream.getTracks().forEach(track => track.stop());
      setMicPermission('granted');
      return true;
    } catch (error) {
      console.error('Microphone permission error:', error);
      setMicPermission('denied');
      
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          setApiError('请允许麦克风权限以进行录音练习。点击浏览器地址栏左侧的锁图标，允许麦克风访问。');
        } else if (error.name === 'NotFoundError') {
          setApiError('未检测到麦克风设备。请连接麦克风后重试。');
        } else {
          setApiError(`麦克风访问失败: ${error.message}`);
        }
      }
      return false;
    }
  };

  // Start the practice flow: Navigate + Play audio immediately, check permission in parallel
  const startPracticeFlow = async () => {
    setApiError(null);
    setIsSOSOpen(false);
    
    // Step 1: Navigate immediately for instant UI feedback
    setPracticePhase('listening');
    navigateToStep('practice');

    // Step 2: Start audio playback AND check mic permission in PARALLEL
    // Audio playback doesn't need mic permission, so we can do both at once
    const [, permissionResult] = await Promise.all([
      // Task A: Play question audio (doesn't need mic)
      (async () => {
        try {
          await questionAudio.playQuestionAudio();
        } catch (error) {
          console.error('Error playing question audio:', error);
        }
      })(),
      // Task B: Check mic permission (for later recording)
      requestMicrophonePermission()
    ]);

    // Check permission result after audio finishes
    if (!permissionResult) {
      // Permission denied, go back to detail page
      navigateToStep('detail');
      return;
    }

    try {
      // Step 3: Play beep to signal countdown start
      await questionAudio.playBeep();
      
      // Step 4: Start 15 second countdown
      startPrepCountdown();
    } catch (error) {
      console.error('Error in practice flow:', error);
      startPrepCountdown();
    }
  };

  const startPrepCountdown = () => {
    setPracticePhase('preparing');
    setTimeLeft(15);
    setIsTimerRunning(true);
  };

  const startRecordingPhase = () => {
    // Update UI immediately - no waiting (stay on practice page, switch phase)
    setPracticePhase('recording');
    setTimeLeft(45);
    setIsTimerRunning(true);
    
    // Skip actual recording in dev mode (for UI debugging)
    if (DEV_SKIP_MIC_CHECK) {
      console.warn('[DEV MODE] Skipping actual recording - microphone not available');
      return;
    }
    
    // Start recording in background (don't await)
    audioRecorder.startRecording().catch((error) => {
      console.error('Failed to start recording:', error);
      setApiError('Failed to access microphone. Please check permissions.');
    });
  };

  const togglePause = () => {
    if (isPaused) {
      audioRecorder.resumeRecording();
    } else {
      audioRecorder.pauseRecording();
    }
    setIsPaused(!isPaused);
  };

  const restartPractice = () => {
    // Stop and clean up recording playback
    if (recordingPlayerRef.current) {
      recordingPlayerRef.current.pause();
      recordingPlayerRef.current = null;
    }
    if (recordingBlobUrlRef.current) {
      URL.revokeObjectURL(recordingBlobUrlRef.current);
      recordingBlobUrlRef.current = null;
    }
    
    // Reset playback state
    setIsPlaying(false);
    setAudioProgress(0);
    setAudioDuration(45);
    
    // Stop recording
    setIsTimerRunning(false);
    setIsPaused(false);
    audioRecorder.stopRecording();
    audioRecorder.clearRecording();
    
    // Start new practice flow
    startPracticeFlow();
  };

  // Track the calculated duration when recording finishes
  const calculatedDurationRef = useRef(45);
  
  const finishRecording = () => {
    // Calculate actual recording duration: initial time (45s) - remaining time
    const actualRecordingDuration = 45 - timeLeft;
    const finalDuration = actualRecordingDuration > 0 ? actualRecordingDuration : 45;
    calculatedDurationRef.current = finalDuration;
    
    console.log('[finishRecording] timeLeft:', timeLeft, 'actualRecordingDuration:', actualRecordingDuration, 'finalDuration:', finalDuration);
    
    setIsTimerRunning(false);
    audioRecorder.stopRecording();
    
    // Reset playback state
    setAudioProgress(0);
    setIsPlaying(false);
    
    // In dev mode, set calculated duration since we don't have real recording
    if (DEV_SKIP_MIC_CHECK) {
      console.warn('[DEV MODE] No actual recording - using calculated duration:', finalDuration);
      setAudioDuration(finalDuration);
      navigateToStep('confirmation');
      return;
    }
    
    // Set calculated duration immediately (will be updated when blob is ready)
    setAudioDuration(finalDuration);
    navigateToStep('confirmation');
  };
  
  // Effect to set up audio playback when blob becomes available
  useEffect(() => {
    // Only set up player when in confirmation step and we have a blob
    if (currentStep !== 'confirmation' || !audioRecorder.audioBlob || DEV_SKIP_MIC_CHECK) {
      return;
    }
    
    // Skip if player already exists for this blob
    if (recordingPlayerRef.current) {
      return;
    }
    
    const blob = audioRecorder.audioBlob;
    console.log('[useEffect] Audio blob available, setting up player. Size:', blob.size, 'Type:', blob.type);
    
    // Clean up old blob URL
    if (recordingBlobUrlRef.current) {
      URL.revokeObjectURL(recordingBlobUrlRef.current);
    }
    
    // Create new blob URL for playback
    const blobUrl = URL.createObjectURL(blob);
    recordingBlobUrlRef.current = blobUrl;
    
    // Create audio element for playback
    const audio = new Audio();
    audio.preload = 'metadata';
    
    audio.addEventListener('loadedmetadata', () => {
      const metadataDuration = audio.duration;
      console.log('[useEffect] Audio metadata loaded, duration:', metadataDuration);
      if (isFinite(metadataDuration) && !isNaN(metadataDuration) && metadataDuration > 0) {
        setAudioDuration(metadataDuration);
      }
    });
    audio.addEventListener('canplaythrough', () => {
      console.log('[useEffect] Audio ready to play');
    });
    audio.addEventListener('timeupdate', () => {
      setAudioProgress(audio.currentTime);
    });
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setAudioProgress(0);
    });
    audio.addEventListener('error', (e) => {
      console.error('[useEffect] Audio error:', audio.error?.message, audio.error?.code);
    });
    
    // Set source and load
    audio.src = blobUrl;
    audio.load();
    
    recordingPlayerRef.current = audio;
  }, [currentStep, audioRecorder.audioBlob]);

  const submitForAnalysis = async () => {
    // In dev mode, skip to analyzing step for UI debugging
    if (DEV_SKIP_MIC_CHECK) {
      console.warn('[DEV MODE] Skipping actual analysis submission');
      navigateToStep('analyzing');
      // Simulate SSE events for dev mode
      const mockEvents = [
        { type: 'uploading', status: 'start' },
        { type: 'uploading', status: 'completed' },
        { type: 'transcribing', status: 'start' },
        { type: 'transcribing', status: 'completed' },
        { type: 'analyzing', status: 'start' },
        { type: 'analyzing', status: 'completed' },
        { type: 'generating', status: 'start' },
        { type: 'generating', status: 'completed' },
      ];
      
      let i = 0;
      const interval = setInterval(() => {
        if (i < mockEvents.length) {
          handleSSEEvent(mockEvents[i] as SSEEvent);
          i++;
        } else {
          clearInterval(interval);
          // Send mock completed event with V2 report
          handleSSEEvent({
            type: 'completed',
            report: {
              analysis_version: '2.0',
              global_evaluation: {
                total_score: 23,
                score_breakdown: { delivery: 8, language_use: 7, topic_development: 8 },
                level: 'Good',
                overall_summary: '[DEV MODE] Mock report for UI debugging.',
                detailed_feedback: 'Your response demonstrates good speaking skills.'
              },
              full_transcript: {
                text: 'I believe that taking a gap year is beneficial.',
                segments: [{ start: 0, end: 3, text: 'I believe that taking a gap year is beneficial.' }]
              },
              chunks: []
            },
            recording_id: 'recording_mock_placeholder',
            audio_url: ''
          });
        }
      }, 400);
      return;
    }
    
    // Stop any playing audio before submitting
    if (recordingPlayerRef.current) {
      recordingPlayerRef.current.pause();
      recordingPlayerRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setAudioProgress(0);
    
    if (!audioRecorder.audioBlob) {
      setApiError('No recording available');
      return;
    }

    if (!currentQuestion) {
      setApiError('No question selected');
      return;
    }

    // Reset analysis steps with AI Tutor style labels
    setAnalysisSteps([
      { id: 1, label: 'Response received securely', status: 'pending' },
      { id: 2, label: 'Listening for every word', status: 'pending' },
      { id: 3, label: 'AI Deep Analysis', status: 'pending' },
      { id: 4, label: 'Generating score & personalized tips', status: 'pending' }
    ]);
    navigateToStep('analyzing');
    setApiError(null);

    try {
      // Use SSE streaming API
      await submitAnalysisWithSSE(
        audioRecorder.audioBlob,
        currentQuestion.question_id,
        handleSSEEvent
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit recording';
      setApiError(message);
      console.error('Error submitting for analysis:', error);
      navigateToStep('confirmation');
    }
  };

  const backToHome = () => {
    // Clean up recording player
    if (recordingPlayerRef.current) {
      recordingPlayerRef.current.pause();
      recordingPlayerRef.current = null;
    }
    if (recordingBlobUrlRef.current) {
      URL.revokeObjectURL(recordingBlobUrlRef.current);
      recordingBlobUrlRef.current = null;
    }
    
    navigateToStep('detail');
    setTimeLeft(15);
    setIsTimerRunning(false);
    setIsSOSOpen(false);
    setExpandedSentenceId(null);
    setAudioProgress(0);
    setAudioDuration(45);
    setIsPlaying(false);
  };

  // Seek to a specific time in the recording
  const seekAudio = (time: number) => {
    const player = recordingPlayerRef.current;
    if (player) {
      player.currentTime = time;
      setAudioProgress(time);
    }
  };

  const toggleAudioPlay = async () => {
    const player = recordingPlayerRef.current;
    
    if (!player) {
      console.error('No recording player available');
      // If no player but we have a blob, try to create one
      if (audioRecorder.audioBlob) {
        console.log('[toggleAudioPlay] Creating new player from blob. Size:', audioRecorder.audioBlob.size, 'Type:', audioRecorder.audioBlob.type);
        
        const blobUrl = URL.createObjectURL(audioRecorder.audioBlob);
        recordingBlobUrlRef.current = blobUrl;
        
        const audio = new Audio();
        audio.preload = 'auto';
        
        // Wait for audio to be ready before playing
        await new Promise<void>((resolve, reject) => {
          const onCanPlay = () => {
            audio.removeEventListener('canplaythrough', onCanPlay);
            audio.removeEventListener('error', onError);
            resolve();
          };
          const onError = () => {
            audio.removeEventListener('canplaythrough', onCanPlay);
            audio.removeEventListener('error', onError);
            reject(new Error(audio.error?.message || 'Audio load failed'));
          };
          
          audio.addEventListener('canplaythrough', onCanPlay);
          audio.addEventListener('error', onError);
          audio.src = blobUrl;
          audio.load();
        });
        
        audio.addEventListener('loadedmetadata', () => {
          const dur = audio.duration;
          if (isFinite(dur) && !isNaN(dur) && dur > 0) {
            setAudioDuration(dur);
          }
        });
        audio.addEventListener('timeupdate', () => {
          setAudioProgress(audio.currentTime);
        });
        audio.addEventListener('ended', () => {
          setIsPlaying(false);
          setAudioProgress(0);
        });
        
        recordingPlayerRef.current = audio;
        
        try {
          await audio.play();
          setIsPlaying(true);
        } catch (err) {
          console.error('Failed to play recording:', err);
        }
      }
      return;
    }
    
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      // Reset if at end - check for valid duration
      const dur = player.duration;
      if (isFinite(dur) && !isNaN(dur) && player.currentTime >= dur) {
        player.currentTime = 0;
        setAudioProgress(0);
      }
      try {
        await player.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Failed to play recording:', err);
      }
    }
  };

  const formatTime = (seconds: number) => {
    // Handle invalid values (Infinity, NaN, negative)
    if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
      return '00:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ---------------- Render ----------------

  const renderCurrentPage = () => {
    switch (currentStep) {
      case 'detail':
        return (
          <DetailPage
            isLoadingQuestions={isLoadingQuestion}
            apiError={apiError}
            currentQuestion={currentQuestion}
            isSOSOpen={isSOSOpen}
            setIsSOSOpen={setIsSOSOpen}
            onStartPractice={startPracticeFlow}
          />
        );
      
      case 'practice':
        return (
          <PracticePage
            phase={practicePhase}
            currentQuestion={currentQuestion}
            timeLeft={timeLeft}
            isPaused={isPaused}
            audioBars={audioBars}
            onTogglePause={togglePause}
            onRestart={restartPractice}
            onFinish={finishRecording}
          />
        );
      
      case 'confirmation':
        return (
          <ConfirmationPage
            isPlaying={isPlaying}
            audioProgress={audioProgress}
            audioTotalTime={audioDuration}
            onTogglePlay={toggleAudioPlay}
            onSeek={seekAudio}
            onSubmit={submitForAnalysis}
            onRestart={restartPractice}
            formatTime={formatTime}
          />
        );
      
      case 'analyzing':
        return (
          <AnalyzingPage analysisSteps={analysisSteps} />
        );
      
      case 'report':
        return (
          <ReportPage
            analysisReport={analysisReport}
            expandedSentenceId={expandedSentenceId}
            setExpandedSentenceId={setExpandedSentenceId}
            onBackToHome={backToHome}
            recordingBlobUrl={serverAudioUrl || recordingBlobUrlRef.current}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pl-20 relative">
      <Sidebar />

      {/* Header */}
      <header className="h-16 border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-20 px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500">Task 1</span>
          <ChevronRight size={16} className="text-gray-300" />
          <span className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">
            {currentQuestion?.instruction.substring(0, 30) || 'Loading...'}...
          </span>
        </div>
        
        {/* Progress Dots */}
        <div className="flex items-center gap-1.5">
           {['Detail', 'Practice', 'Confirm', 'Result'].map((s, i) => {
             // Map current step to visual progress
             let visualIdx = 0;
             if (currentStep === 'practice') visualIdx = 1;
             if (currentStep === 'confirmation') visualIdx = 2;
             if (currentStep === 'analyzing' || currentStep === 'report') visualIdx = 3;
             
             return (
               <div key={s} className={`h-2 rounded-full transition-all duration-500 ${visualIdx >= i ? 'w-8 bg-blue-600' : 'w-2 bg-gray-200'}`} />
             )
           })}
        </div>
      </header>

      {/* Global Error Alert */}
      {apiError && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-lg flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-red-900 font-semibold text-sm mb-1">Error</h4>
              <p className="text-red-700 text-sm">{apiError}</p>
            </div>
            <button 
              onClick={() => setApiError(null)}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <ChevronUp size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex flex-col h-[calc(100vh-64px)] overflow-hidden relative">
        <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto w-full mx-auto">
          {renderCurrentPage()}
        </div>
      </main>
    </div>
  );
};

// Main App with Routes
const AppRoutes = () => {
  const { user } = useAuth();
  
  return (
    <Routes>
      {/* Auth route - redirect to questions if already logged in */}
      <Route 
        path="/auth" 
        element={
          user ? <Navigate to={`/questions/${DEFAULT_QUESTION_ID}`} replace /> : <AuthPage />
        } 
      />
      
      {/* Default redirect */}
      <Route path="/" element={<Navigate to={`/questions/${DEFAULT_QUESTION_ID}`} replace />} />
      
      {/* Protected question routes */}
      <Route 
        path="/questions/:questionId" 
        element={
          <ProtectedRoute>
            <QuestionPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/questions/:questionId/:step" 
        element={
          <ProtectedRoute>
            <QuestionPage />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
};

// Root App with Auth Provider
const App = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;
