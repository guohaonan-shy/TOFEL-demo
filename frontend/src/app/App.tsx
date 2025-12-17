import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, AlertCircle, ChevronUp } from 'lucide-react';

// API and Hooks
import { fetchQuestion, uploadRecording, startAnalysis, getAnalysisResult, type Question, type AnalysisResponse } from '../services/api';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useQuestionAudio } from '../hooks/useQuestionAudio';

// Default question ID for initial load
const DEFAULT_QUESTION_ID = 'question_01KCH9WP8W6TZXA5QXS1BFF6AS';

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
  PrepPage, 
  RecordingPage, 
  ConfirmationPage, 
  AnalyzingPage, 
  ReportPage,
  type AnalysisStep 
} from './pages';

const App = () => {
  // Core Steps: 'detail' (P1) -> 'prep_tts' (P2-1) -> 'prep_countdown' (P2-2) -> 'recording' (P3) -> 'confirmation' (P4) -> 'analyzing' (P4.5) -> 'report' (P5)
  const [currentStep, setCurrentStep] = useState('detail'); 
  
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
  const recordingBlobUrlRef = useRef<string | null>(null);
  
  // P4.5 Analysis Progress State
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([
    { id: 1, label: 'Transcription', status: 'pending' },
    { id: 2, label: 'Rating', status: 'pending' },
    { id: 3, label: 'Grammar Analysis', status: 'pending' },
    { id: 4, label: 'Generating Feedback', status: 'pending' }
  ]);
  
  // P5 Report State
  const [expandedSentenceId, setExpandedSentenceId] = useState<number | null>(null);

  // Backend Integration State
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [recordingId, setRecordingId] = useState<number | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [analysisReport, setAnalysisReport] = useState<AnalysisResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Microphone Permission State
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  
  // Audio Recorder Hook
  const audioRecorder = useAudioRecorder();
  
  // Question Audio Hook (for playing question audio and beeps)
  const questionAudio = useQuestionAudio();

  // ---------------- Logic Controllers ----------------

  // P1: Fetch default question on Mount and cache audio
  useEffect(() => {
    const loadQuestion = async () => {
      setIsLoadingQuestion(true);
      setApiError(null);
      try {
        const question = await fetchQuestion(DEFAULT_QUESTION_ID);
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
  }, []);

  // Pre-warm microphone when countdown is about to end (5 seconds left)
  useEffect(() => {
    if (currentStep === 'prep_countdown' && timeLeft === 5 && !DEV_SKIP_MIC_CHECK) {
      console.log('Pre-warming microphone for recording...');
      audioRecorder.warmup();
    }
  }, [currentStep, timeLeft]);

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

  // P2 Auto Flow: When in prep_tts, audio is playing. After audio ends, beep and start countdown.
  // This effect is now handled by startPracticeFlow which plays audio then transitions.

  // Recording Waveform Animation - use ref to access latest audioLevel without re-triggering effect
  const audioLevelRef = useRef(audioRecorder.audioLevel);
  audioLevelRef.current = audioRecorder.audioLevel;

  useEffect(() => {
    if (currentStep === 'recording' && isTimerRunning && !isPaused && audioRecorder.isRecording) {
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
    } else if (currentStep !== 'recording' || isPaused) {
      setAudioBars(new Array(30).fill(10));
    }
  }, [currentStep, isTimerRunning, isPaused, audioRecorder.isRecording]);

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

  // P4.5 Analysis Polling
  useEffect(() => {
    if (currentStep === 'analyzing' && taskId) {
      setAnalysisSteps([
        { id: 1, label: 'Transcription', status: 'completed' },
        { id: 2, label: 'Rating', status: 'completed' },
        { id: 3, label: 'AI Analysis', status: 'processing' },
        { id: 4, label: 'Generating Report', status: 'pending' }
      ]);

      let pollCount = 0;
      const maxPolls = 60;

      const pollInterval = setInterval(async () => {
        pollCount++;

        if (pollCount > maxPolls) {
          clearInterval(pollInterval);
          setApiError('Analysis timeout - please try again');
          setCurrentStep('confirmation');
          return;
        }

        try {
          const result = await getAnalysisResult(taskId);
          
          if (result.status === 'completed') {
            setAnalysisSteps(prev => prev.map(s => ({...s, status: 'completed'})));
            setAnalysisReport(result);
            clearInterval(pollInterval);
            setTimeout(() => setCurrentStep('report'), 800);
          } else if (result.status === 'failed') {
            clearInterval(pollInterval);
            setApiError(result.error_message || 'Analysis failed');
            setCurrentStep('confirmation');
          } else {
            setAnalysisSteps(prev => prev.map(s => 
              s.id === 3 ? {...s, status: 'processing'} : 
              s.id === 4 ? {...s, status: 'pending'} : s
            ));
          }
        } catch (error) {
          console.error('Error polling analysis:', error);
        }
      }, 2000);

      return () => clearInterval(pollInterval);
    }
  }, [currentStep, taskId]);

  const handleTimerComplete = async () => {
    if (currentStep === 'prep_countdown') {
      // Play beep before starting recording
      await questionAudio.playBeep();
      startRecordingPhase();
    } else if (currentStep === 'recording') {
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

  // Start the practice flow: Check permission -> Play question audio -> beep -> 15s countdown -> beep -> recording
  const startPracticeFlow = async () => {
    setApiError(null);
    
    // Step 0: Request microphone permission first
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      return; // Stop if permission denied
    }
    
    setIsSOSOpen(false);
    
    // Step 1: Switch to prep_tts page AND start playing audio simultaneously
    // Use Promise.all to ensure UI updates and audio starts at the same time
    setCurrentStep('prep_tts');
    
    try {
      // Start audio playback immediately (audio should already be preloaded)
      await questionAudio.playQuestionAudio();
      
      // Step 2: Play beep to signal countdown start
      await questionAudio.playBeep();
      
      // Step 3: Start 15 second countdown
      startPrepCountdown();
    } catch (error) {
      console.error('Error in practice flow:', error);
      // If audio fails, still proceed with countdown after beep
      try {
        await questionAudio.playBeep();
      } catch {}
      startPrepCountdown();
    }
  };

  const startPrepCountdown = () => {
    setCurrentStep('prep_countdown');
    setTimeLeft(15);
    setIsTimerRunning(true);
  };

  const startRecordingPhase = () => {
    // Update UI immediately - no waiting
    setCurrentStep('recording');
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
      setCurrentStep('confirmation');
      return;
    }
    
    // Set calculated duration immediately (will be updated when blob is ready)
    setAudioDuration(finalDuration);
    setCurrentStep('confirmation');
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
      setCurrentStep('analyzing');
      // Simulate analysis completion after 3 seconds
      setTimeout(() => {
        setAnalysisSteps(prev => prev.map(s => ({...s, status: 'completed'})));
        // Set mock report for UI testing
        setAnalysisReport({
          task_id: 0,
          status: 'completed',
          report_markdown: null,
          report_json: {
            delivery_score: 8,
            delivery_comment: 'Good pace and clarity',
            language_score: 7,
            language_comment: 'Minor grammar issues',
            topic_score: 8,
            topic_comment: 'Well-developed ideas',
            total_score: 23,
            level: 'Good',
            overall_summary: '[DEV MODE] This is a mock report for UI debugging. Your response demonstrates good speaking skills with clear pronunciation and logical structure.',
            sentence_analyses: [
              {
                original_text: 'I believe that taking a gap year is beneficial.',
                evaluation: '✅ 优秀',
                native_version: 'I firmly believe that taking a gap year can be highly beneficial.',
                grammar_feedback: '语法正确',
                expression_feedback: '表达清晰',
                suggestion_feedback: '可以使用更高级的词汇如 "firmly believe" 来增强语气',
                start_time: 0,
                end_time: 3,
              },
              {
                original_text: 'Because it give students time to explore.',
                evaluation: '⚡ 可改进',
                native_version: 'Because it gives students valuable time to explore their interests.',
                grammar_feedback: '主谓一致错误: "it give" 应为 "it gives"',
                expression_feedback: '表达较简单',
                suggestion_feedback: '添加形容词如 "valuable" 来丰富表达',
                start_time: 3,
                end_time: 6,
              },
            ],
            actionable_tips: [
              '注意第三人称单数动词变化',
              '使用更丰富的形容词来增强表达',
              '保持良好的语速和停顿',
            ],
          },
          error_message: null,
          created_at: new Date().toISOString(),
        });
        setTimeout(() => setCurrentStep('report'), 500);
      }, 2000);
      return;
    }
    
    if (!audioRecorder.audioBlob) {
      setApiError('No recording available');
      return;
    }

    if (!currentQuestion) {
      setApiError('No question selected');
      return;
    }

    setCurrentStep('analyzing');
    setApiError(null);

    try {
      setAnalysisSteps(prev => prev.map(s => s.id === 1 ? {...s, status: 'processing'} : s));
      const uploadResult = await uploadRecording(audioRecorder.audioBlob, currentQuestion.question_id);
      setRecordingId(uploadResult.id);
      setAnalysisSteps(prev => prev.map(s => s.id === 1 ? {...s, status: 'completed'} : s));

      setAnalysisSteps(prev => prev.map(s => s.id === 2 ? {...s, status: 'processing'} : s));
      const analysisResult = await startAnalysis(uploadResult.id);
      setTaskId(analysisResult.task_id);
      setAnalysisSteps(prev => prev.map(s => s.id === 2 ? {...s, status: 'completed'} : s));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit recording';
      setApiError(message);
      console.error('Error submitting for analysis:', error);
      setCurrentStep('confirmation');
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
    
    setCurrentStep('detail');
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
      
      case 'prep_tts':
      case 'prep_countdown':
        return (
          <PrepPage
            currentStep={currentStep as 'prep_tts' | 'prep_countdown'}
            currentQuestion={currentQuestion}
            timeLeft={timeLeft}
          />
        );
      
      case 'recording':
        return (
          <RecordingPage
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
           {['Detail', 'Prep', 'Record', 'Result'].map((s, i) => {
             const stepIdx = ['detail', 'prep_tts', 'prep_countdown', 'recording', 'confirmation', 'analyzing', 'report'].indexOf(currentStep);
             let visualIdx = 0;
             if (stepIdx >= 1) visualIdx = 1;
             if (stepIdx >= 3) visualIdx = 2;
             if (stepIdx >= 5) visualIdx = 3;
             
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

export default App;
