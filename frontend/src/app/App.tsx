import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Mic, Play, Square, Clock, ChevronRight, BarChart2, 
  CheckCircle2, AlertCircle, Settings, Home, BookOpen, 
  User, HelpCircle, RefreshCcw, Pause, RotateCcw, 
  ChevronDown, ChevronUp, Star, Zap, Volume2, Sparkles, ArrowRight
} from 'lucide-react';

// API and Hooks
import { fetchQuestions, uploadRecording, startAnalysis, getAnalysisResult, type Question, type AnalysisResponse } from '../services/api';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

// --- Fallback Mock Data (for development) ---

const MOCK_REPORT = {
  score: 23,
  level: "Good",
  radar: { delivery: "Fair", language: "Good", topic: "Good" },
  summary: "Logic is clear, arguments are strong. However, linking sounds and past tense usage could be more native-like.",
  transcript: [
    { 
      id: 1, 
      original: "I think take a gap year is good for students.", 
      improved: "I believe taking a gap year is highly beneficial for students.",
      reason: {
        grammar: "When a verb acts as the subject of a sentence, we need the gerund form ('-ing'). You wrote 'take' but it should be 'taking'.",
        expression: "Instead of the basic word 'good', native speakers prefer more precise academic vocabulary like 'beneficial' or 'advantageous' in formal contexts.",
        tip: "Practice using gerunds as subjects: 'Swimming is fun', 'Reading helps learning'. Also, build your academic vocabulary list with words like beneficial, significant, crucial."
      },
      type: "suggestion",
      startTime: 0,
      endTime: 3
    },
    { 
      id: 2, 
      original: "It helps them to earn money and know what they want.", 
      improved: "It allows them to achieve financial independence and gain career clarity.",
      reason: {
        content: "Your idea about earning money and self-discovery is excellent! But you can make it more impactful by being specific about the *outcomes* rather than just the actions.",
        expression: "The phrase 'earn money' is casual. 'Achieve financial independence' is more sophisticated and emphasizes the benefit. Similarly, 'gain career clarity' is much stronger than 'know what they want'.",
        tip: "When making arguments, focus on specific outcomes and benefits. Replace vague phrases with precise terminology: instead of 'learn things' → 'develop skills', instead of 'get better' → 'enhance proficiency'."
      },
      type: "suggestion",
      startTime: 3,
      endTime: 8
    },
    { 
      id: 3, 
      original: "So, I agree with this statement.", 
      improved: null,
      reason: "Perfect closing! Your conclusion is clear and direct. This kind of simple, confident statement works really well in TOEFL speaking. Keep doing this! 💪",
      type: "good",
      startTime: 8,
      endTime: 11
    },
    {
      id: 4,
      original: "Because they can learn many things from working.",
      improved: "Through real-world work experience, they develop practical skills that can't be taught in a classroom.",
      reason: {
        content: "You're providing a supporting reason, which is great! However, 'many things' is too vague. Strong arguments need specific examples of *what* makes the experience valuable.",
        expression: "Native speakers avoid vague words like 'many things'. Instead, they use concrete nouns ('practical skills') and add qualifying details ('that can't be taught in a classroom') to strengthen the claim.",
        tip: "Replace vague quantifiers with specific categories. Instead of 'many things' → specify what: 'practical skills', 'industry knowledge', 'professional networks'. This makes your argument much more convincing."
      },
      type: "suggestion",
      startTime: 11,
      endTime: 16
    }
  ]
};

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
  const audioTotalTime = 45; // Total recording time in seconds
  
  // P4.5 Analysis Progress State
  const [analysisSteps, setAnalysisSteps] = useState([
    { id: 1, label: 'Transcription', status: 'pending' }, // pending, processing, completed
    { id: 2, label: 'Rating', status: 'pending' },
    { id: 3, label: 'Grammar Analysis', status: 'pending' },
    { id: 4, label: 'Generating Feedback', status: 'pending' }
  ]);
  
  // P5 Report State
  const [expandedSentenceId, setExpandedSentenceId] = useState<number | null>(null); // Currently expanded sentence
  
  // P5 Audio Sync State
  const [currentPlayingSentence, setCurrentPlayingSentence] = useState<number | null>(null);

  // NEW: Backend Integration State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [recordingId, setRecordingId] = useState<number | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [analysisReport, setAnalysisReport] = useState<AnalysisResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // NEW: Audio Recorder Hook
  const audioRecorder = useAudioRecorder();

  // ---------------- Logic Controllers ----------------

  // P1: Fetch Questions on Mount
  useEffect(() => {
    const loadQuestions = async () => {
      setIsLoadingQuestions(true);
      setApiError(null);
      try {
        const data = await fetchQuestions();
        setQuestions(data.questions);
        if (data.questions.length > 0) {
          setCurrentQuestion(data.questions[0]);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load questions';
        setApiError(message);
        console.error('Error fetching questions:', error);
      } finally {
        setIsLoadingQuestions(false);
      }
    };
    loadQuestions();
  }, []);

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

  // P2 Auto Flow: TTS -> Beep -> Countdown
  useEffect(() => {
    if (currentStep === 'prep_tts') {
      // Simulate TTS Duration (3s)
      const ttsTimer = setTimeout(() => {
        // Play Beep Sound (Mock)
        // console.log("Beep!"); 
        startPrepCountdown();
      }, 3000);
      return () => clearTimeout(ttsTimer);
    }
  }, [currentStep]);

  // Recording Waveform Animation - Updated to use real audio levels
  useEffect(() => {
    if (currentStep === 'recording' && isTimerRunning && !isPaused && audioRecorder.isRecording) {
      const updateBars = () => {
        // Use real audio level from recorder, with some randomization for visual effect
        const baseLevel = audioRecorder.audioLevel / 2; // Normalize from 0-100 to 0-50
        setAudioBars(prev => prev.map(() => Math.max(8, baseLevel + Math.random() * 20)));
      };
      const barInterval = setInterval(updateBars, 100);
      return () => clearInterval(barInterval);
    } else if (currentStep !== 'recording' || isPaused) {
      // Reset bars when not recording or paused
      setAudioBars(new Array(30).fill(10));
    }
  }, [currentStep, isTimerRunning, isPaused, audioRecorder.isRecording, audioRecorder.audioLevel]);

  // Audio Player Progress (P4 & P5)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isPlaying && audioProgress < audioTotalTime) {
      interval = setInterval(() => {
        setAudioProgress((prev) => {
          const newProgress = prev + 0.1;
          if (newProgress >= audioTotalTime) {
            setIsPlaying(false);
            return audioTotalTime;
          }
          
          // P5: Update currently playing sentence based on time
          if (currentStep === 'report') {
            const current = MOCK_REPORT.transcript.find(
              (item) => newProgress >= item.startTime && newProgress < item.endTime
            );
            if (current) {
              setCurrentPlayingSentence(current.id);
            } else {
              setCurrentPlayingSentence(null);
            }
          }
          
          return newProgress;
        });
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, audioProgress, audioTotalTime, currentStep]);

  // P4.5 Analysis Polling - Real backend polling
  useEffect(() => {
    if (currentStep === 'analyzing' && taskId) {
      // Reset analysis steps
      setAnalysisSteps([
        { id: 1, label: 'Transcription', status: 'completed' }, // Already completed (upload done)
        { id: 2, label: 'Rating', status: 'completed' }, // Already completed (task created)
        { id: 3, label: 'AI Analysis', status: 'processing' },
        { id: 4, label: 'Generating Report', status: 'pending' }
      ]);

      let pollCount = 0;
      const maxPolls = 60; // Maximum 2 minutes (60 * 2 seconds)

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
            // Analysis complete!
            setAnalysisSteps(prev => prev.map(s => ({...s, status: 'completed'})));
            setAnalysisReport(result);
            clearInterval(pollInterval);
            setTimeout(() => setCurrentStep('report'), 800);
          } else if (result.status === 'failed') {
            clearInterval(pollInterval);
            setApiError(result.error_message || 'Analysis failed');
            setCurrentStep('confirmation');
          } else {
            // Still processing - update UI
            setAnalysisSteps(prev => prev.map(s => 
              s.id === 3 ? {...s, status: 'processing'} : 
              s.id === 4 ? {...s, status: 'pending'} : s
            ));
          }
        } catch (error) {
          console.error('Error polling analysis:', error);
          // Continue polling on error
        }
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(pollInterval);
    }
  }, [currentStep, taskId]);

  const handleTimerComplete = () => {
    if (currentStep === 'prep_countdown') {
      // P2 End -> P3
      startRecordingPhase();
    } else if (currentStep === 'recording') {
      // P3 End -> P4
      finishRecording();
    }
  };

  // ---------------- Actions ----------------

  const startPracticeFlow = () => {
    // P1 -> P2 (TTS Phase)
    setCurrentStep('prep_tts');
    setIsSOSOpen(false);
  };

  const startPrepCountdown = () => {
    // P2 TTS End -> P2 Countdown
    setCurrentStep('prep_countdown');
    setTimeLeft(15);
    setIsTimerRunning(true);
  };

  const startRecordingPhase = async () => {
    // P2 -> P3
    setCurrentStep('recording');
    setTimeLeft(45);
    setIsTimerRunning(true);
    
    // Start real audio recording
    try {
      await audioRecorder.startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
      setApiError('Failed to access microphone. Please check permissions.');
    }
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
    // Retry: Back to Prep
    setIsTimerRunning(false);
    setIsPaused(false);
    audioRecorder.stopRecording();
    audioRecorder.clearRecording();
    startPracticeFlow(); 
  };

  const finishRecording = () => {
    setIsTimerRunning(false);
    audioRecorder.stopRecording();
    setCurrentStep('confirmation');
  };

  const submitForAnalysis = async () => {
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
      // Step 1: Upload recording
      setAnalysisSteps(prev => prev.map(s => s.id === 1 ? {...s, status: 'processing'} : s));
      const uploadResult = await uploadRecording(audioRecorder.audioBlob, currentQuestion.question_id);
      setRecordingId(uploadResult.id);
      setAnalysisSteps(prev => prev.map(s => s.id === 1 ? {...s, status: 'completed'} : s));

      // Step 2: Start analysis
      setAnalysisSteps(prev => prev.map(s => s.id === 2 ? {...s, status: 'processing'} : s));
      const analysisResult = await startAnalysis(uploadResult.id);
      setTaskId(analysisResult.task_id);
      setAnalysisSteps(prev => prev.map(s => s.id === 2 ? {...s, status: 'completed'} : s));

      // Note: Polling will be handled in a separate useEffect (P4.5)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit recording';
      setApiError(message);
      console.error('Error submitting for analysis:', error);
      setCurrentStep('confirmation'); // Go back to confirmation page
    }
  };

  const backToHome = () => {
    // Reset to P1
    setCurrentStep('detail');
    setTimeLeft(15);
    setIsTimerRunning(false);
    setIsSOSOpen(false);
    setExpandedSentenceId(null);
    setAudioProgress(0);
    setIsPlaying(false);
  };

  // P5: Jump to specific audio timestamp when clicking a sentence
  const jumpToAudioTime = (startTime: number) => {
    setAudioProgress(startTime);
    setIsPlaying(true);
  };

  // Audio Player Controls
  const toggleAudioPlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      if (audioProgress >= audioTotalTime) {
        setAudioProgress(0);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ---------------- Component Views ----------------

  // P1: Question Detail & SOS
  const renderDetail = () => {
    if (isLoadingQuestions) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading questions...</p>
          </div>
        </div>
      );
    }

    if (apiError || !currentQuestion) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md">
            <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Failed to Load Questions</h3>
            <p className="text-gray-600 mb-4">{apiError || 'No questions available'}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full max-w-3xl mx-auto w-full animate-in fade-in zoom-in-95 duration-300">
        
        {/* Question Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 w-full text-center mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
          <p className="text-sm text-gray-500 font-medium font-serif italic mb-6">
            Do you agree or disagree with the following statement? Use specific reasons and examples to support your answer.
          </p>
          <h2 className="text-2xl md:text-4xl font-bold text-gray-900 leading-tight">
            "{currentQuestion.instruction}"
          </h2>
        </div>
        
        {/* SOS Capsule (Interaction Core) */}
        <div className="relative w-full flex flex-col items-center z-10">
          <button 
            onClick={() => setIsSOSOpen(!isSOSOpen)}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-full shadow-lg transition-all duration-300
              ${isSOSOpen 
                ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-200 translate-y-0' 
                : 'bg-white text-gray-600 hover:bg-amber-50 -translate-y-2'}
            `}
          >
            <Zap size={18} className={isSOSOpen ? "fill-amber-700" : "text-amber-500"} />
            <span className="font-bold">{isSOSOpen ? "Hide Hints" : "No Idea? / 没思路？"}</span>
            {isSOSOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* SOS Expanded Content */}
          {isSOSOpen && (
            <div className="mt-4 bg-white p-6 rounded-2xl shadow-xl border border-amber-100 w-full max-w-2xl animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-start gap-4 mb-4 pb-4 border-b border-gray-50">
                <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                   <Sparkles size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Keywords & Ideas</h4>
                  <div className="flex flex-wrap gap-2">
                    {currentQuestion.sos_keywords.map((kw, i) => (
                      <span key={i} className="px-3 py-1.5 bg-amber-50 text-amber-800 text-sm font-semibold rounded-lg border border-amber-100">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                 <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                   <Volume2 size={20} />
                 </div>
                 <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Starter Sentence</h4>
                  <p className="text-gray-700 font-medium text-lg leading-relaxed">
                    "{currentQuestion.sos_starter}"
                  </p>
                 </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1" /> {/* Spacer */}

        <button 
          onClick={startPracticeFlow}
          className="mb-8 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold px-16 py-4 rounded-full shadow-xl shadow-blue-200 transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
        >
          <span>Start Practice</span>
          <ArrowRight size={20} />
        </button>
      </div>
    );
  };

  // P2: Preparation Phase (TTS + Countdown)
  const renderPrep = () => (
    <div className="flex flex-col items-center h-full w-full max-w-4xl mx-auto pt-4 animate-in fade-in duration-500">
      
      {/* Question Fixed Top */}
      <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8 text-center opacity-90">
          <h2 className="text-xl font-bold text-gray-800">
          "{currentQuestion?.instruction || ''}"
        </h2>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center">
        {currentStep === 'prep_tts' ? (
           // TTS State
           <div className="text-center animate-pulse">
             <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500">
               <Volume2 size={40} />
             </div>
             <h3 className="text-xl font-semibold text-gray-700">Reading Instructions...</h3>
             <p className="text-gray-400 mt-2">Listen carefully</p>
           </div>
        ) : (
           // Countdown State
           <div className="text-center">
             <span className="inline-block px-4 py-1.5 bg-green-100 text-green-700 text-sm font-bold rounded-full mb-8 tracking-wide uppercase">
               Preparation Time
             </span>
             <div className="relative flex items-center justify-center">
               {/* Simple Ring Progress Background */}
               <svg className="w-64 h-64 transform -rotate-90">
                  <circle cx="128" cy="128" r="120" stroke="#f1f5f9" strokeWidth="4" fill="transparent" />
                  <circle 
                    cx="128" cy="128" r="120" 
                    stroke={timeLeft <= 3 ? "#ef4444" : "#22c55e"} 
                    strokeWidth="4" 
                    fill="transparent" 
                    strokeDasharray={`${(timeLeft/15)*753} 753`}
                    className="transition-all duration-1000 ease-linear"
                  />
               </svg>
               <div className={`absolute inset-0 flex items-center justify-center text-8xl font-mono font-light tracking-tighter ${timeLeft <= 3 ? 'text-red-500' : 'text-slate-800'}`}>
                 {timeLeft}
               </div>
             </div>
             <p className="text-gray-400 text-sm mt-8 animate-pulse">Think about your main argument...</p>
           </div>
        )}
      </div>
    </div>
  );

  // P3: Recording Phase
  const renderRecording = () => (
    <div className="flex flex-col items-center h-full w-full max-w-4xl mx-auto pt-4 animate-in fade-in duration-500">
      
       {/* Question Fixed Top */}
       <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8 text-center opacity-90">
         <h2 className="text-xl font-bold text-gray-800">
          "{currentQuestion?.instruction || ''}"
        </h2>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        {/* Status */}
        <div className="mb-6 flex items-center gap-2 px-4 py-1.5 bg-red-50 rounded-full border border-red-100">
           <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
           <span className="text-red-600 font-bold text-xs tracking-wider uppercase">Recording Now</span>
        </div>

        {/* Timer */}
        <div className="text-7xl font-mono text-slate-800 tabular-nums mb-8">
            00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
        </div>

        {/* Waveform Visualization */}
        <div className="h-24 flex items-center justify-center gap-1.5 w-full max-w-lg mb-16">
          {audioBars.map((h, i) => (
            <div 
              key={i} 
              className={`w-2 rounded-full transition-all duration-100 ${isPaused ? 'bg-gray-300 h-2' : 'bg-gradient-to-t from-blue-500 to-indigo-400'}`}
              style={{ height: isPaused ? '4px' : `${h}px` }}
            />
          ))}
        </div>

        {/* Controls: Restart (Left), Pause (Center), Done (Right) */}
        <div className="flex items-center gap-12">
           <button 
            onClick={restartPractice}
            className="group flex flex-col items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <div className="w-14 h-14 rounded-full border-2 border-gray-200 flex items-center justify-center group-hover:border-gray-400 bg-white">
              <RotateCcw size={20} />
            </div>
            <span className="text-xs font-medium">Restart</span>
          </button>

          <button 
            onClick={togglePause}
            className="flex flex-col items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors transform hover:scale-105 active:scale-95 duration-200"
          >
            <div className="w-20 h-20 rounded-full bg-white shadow-xl shadow-blue-100 border border-blue-50 flex items-center justify-center text-blue-600 ring-4 ring-blue-50">
               {isPaused ? <Play size={36} className="ml-1.5" /> : <Pause size={36} />}
            </div>
            <span className="text-xs font-medium">{isPaused ? "Resume" : "Pause"}</span>
          </button>

          <button 
            onClick={finishRecording}
            className="group flex flex-col items-center gap-2 text-gray-400 hover:text-red-600 transition-colors"
          >
             <div className="w-14 h-14 rounded-full border-2 border-red-100 bg-red-50 flex items-center justify-center text-red-500 group-hover:bg-red-100 group-hover:border-red-200">
              <Square size={18} fill="currentColor" />
            </div>
            <span className="text-xs font-medium">Done</span>
          </button>
        </div>
      </div>
    </div>
  );

  // P4: Confirmation Page
  const renderConfirmation = () => {
    const progressPercentage = (audioProgress / audioTotalTime) * 100;
    
    return (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto animate-in zoom-in-95 duration-300">
      <div className="bg-white rounded-3xl p-10 shadow-xl border border-gray-100 w-full text-center">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Recording Complete!</h2>
        <p className="text-gray-500 mb-10 text-lg">Good effort. Listen to your response or submit for scoring.</p>

        {/* Interactive Audio Player */}
        <div className="bg-gray-50 rounded-2xl p-6 mb-10 flex items-center gap-4 border border-gray-200">
           <button 
             onClick={toggleAudioPlay}
             className="w-12 h-12 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center text-gray-700 hover:text-blue-600 hover:scale-105 transition-all"
           >
             {isPlaying ? <Pause size={20} /> : <Play size={20} fill="currentColor" className="ml-1" />}
           </button>
           <div className="flex-1">
             <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2">
               <div 
                 className="h-full bg-blue-500 rounded-full transition-all duration-100" 
                 style={{ width: `${progressPercentage}%` }}
               ></div>
             </div>
             <div className="flex justify-between text-xs font-mono text-gray-400">
               <span>{formatTime(audioProgress)}</span>
               <span>{formatTime(audioTotalTime)}</span>
             </div>
           </div>
        </div>

        <div className="flex flex-col gap-4">
           {/* Primary Action */}
          <button 
            onClick={submitForAnalysis}
            className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5"
          >
            Submit for AI Analysis
          </button>

          {/* Secondary Action */}
          <button 
            onClick={restartPractice}
            className="w-full py-4 rounded-xl border border-gray-200 text-gray-500 font-semibold hover:bg-gray-50 hover:text-gray-800 transition-colors"
          >
            Retry / 重录 (Discard)
          </button>
        </div>
      </div>
    </div>
  )};

  // P4.5: Analyzing Page
  const renderAnalyzing = () => (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto animate-in zoom-in-95 duration-300">
      <div className="bg-white rounded-3xl p-10 shadow-xl border border-gray-100 w-full">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse">
          <Sparkles size={40} />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3 text-center">AI is Analyzing...</h2>
        <p className="text-gray-500 mb-10 text-lg text-center">Our advanced AI is processing your response. This usually takes 8-10 seconds.</p>

        {/* Analysis Progress */}
        <div className="space-y-4">
          {analysisSteps.map((step, index) => (
            <div 
              key={step.id} 
              className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                step.status === 'completed' 
                  ? 'bg-green-50 border border-green-100' 
                  : step.status === 'processing'
                    ? 'bg-blue-50 border border-blue-100 scale-105'
                    : 'bg-gray-50 border border-gray-100'
              }`}
            >
              <div className="flex items-center justify-center w-8 h-8 shrink-0">
                {step.status === 'completed' && (
                  <CheckCircle2 size={24} className="text-green-600" />
                )}
                {step.status === 'processing' && (
                  <div className="w-5 h-5 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                )}
                {step.status === 'pending' && (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                )}
              </div>
              <div className="flex-1">
                <span className={`font-semibold ${
                  step.status === 'completed' 
                    ? 'text-green-700' 
                    : step.status === 'processing'
                      ? 'text-blue-700'
                      : 'text-gray-400'
                }`}>
                  {step.label}
                </span>
                {step.status === 'processing' && (
                  <div className="mt-1 h-1 bg-blue-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                  </div>
                )}
              </div>
              {step.status === 'completed' && (
                <span className="text-xs text-green-600 font-medium">✓ Done</span>
              )}
              {step.status === 'processing' && (
                <span className="text-xs text-blue-600 font-medium animate-pulse">Processing...</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // P5: AI Report Page
  // Helper Component: Sentence Card
  const SentenceCard = ({ sentence, index }: { sentence: any; index: number }) => {
    const isGood = sentence.evaluation.includes('优秀');
    const isExpanded = expandedSentenceId === index;
    
    return (
      <div className={`group transition-all ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-gray-50'}`}>
        <div className="p-5 cursor-pointer" onClick={() => setExpandedSentenceId(isExpanded ? null : index)}>
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="mt-1.5 shrink-0">
              {isGood ? 
                <CheckCircle2 size={18} className="text-green-500" /> : 
                <Zap size={18} className="text-blue-500" />
              }
            </div>
            
            {/* Original Text */}
            <div className="flex-1">
              <p className="text-lg leading-relaxed text-gray-800 font-medium">
                {sentence.original_text}
              </p>
              
              {/* Expandable Feedback */}
              {isExpanded && (
                <div className="mt-4 animate-in fade-in duration-300">
                  {sentence.native_version && (
                    <div className="bg-white rounded-xl border border-blue-100 p-5 shadow-sm mb-3">
                      <div className="flex items-start gap-4 mb-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
                          <Star size={14} fill="currentColor" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-bold text-blue-600 uppercase mb-1">
                            Native Speaker Version
                          </div>
                          <p className="text-gray-900 text-lg font-serif leading-relaxed">
                            {sentence.native_version}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Feedback Details */}
                  <div className="space-y-3 pl-12">
                    <div>
                      <div className="text-xs font-bold text-blue-600 mb-1">语法：</div>
                      <div className="text-sm text-gray-700">{sentence.grammar_feedback}</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-green-600 mb-1">表达：</div>
                      <div className="text-sm text-gray-700">{sentence.expression_feedback}</div>
                    </div>
                    <div className="bg-indigo-50 p-3 rounded-lg">
                      <div className="text-xs font-bold text-indigo-600 mb-1 flex items-center gap-1">
                        <Star size={12} className="fill-indigo-200" />
                        建议：
                      </div>
                      <div className="text-sm text-indigo-700">{sentence.suggestion_feedback}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Chevron */}
            <ChevronDown 
              size={20} 
              className={`transition-transform ${isExpanded ? 'rotate-180' : ''} text-gray-300`}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderReport = () => {
    if (!analysisReport?.report_json) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle size={48} className="text-amber-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Report Available</h3>
            <p className="text-gray-600 mb-4">The analysis report could not be loaded.</p>
            <button 
              onClick={backToHome}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Home
            </button>
          </div>
        </div>
      );
    }
    
    const report = analysisReport.report_json;
    
    return (
      <div className="w-full max-w-5xl mx-auto h-full overflow-y-auto pb-24">
        {/* Score Card + Summary Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Score Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border lg:col-span-1">
            <div className="text-gray-400 text-xs font-bold uppercase mb-6">ETS Estimated Score</div>
            <div className="relative mb-6 flex justify-center">
              <svg className="w-36 h-36 transform -rotate-90">
                <circle cx="72" cy="72" r="64" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                <circle 
                  cx="72" cy="72" r="64" 
                  stroke="#3b82f6" 
                  strokeWidth="8" 
                  fill="transparent"
                  strokeDasharray={`${(report.total_score/30)*402} 402`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-gray-900">{report.total_score}</span>
                <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded mt-1 uppercase">
                  {report.level}
                </span>
              </div>
            </div>
            
            {/* Component Scores */}
            <div className="flex justify-between gap-2 text-center text-xs">
              <div className="flex-1 bg-gray-50 py-2 rounded-lg border">
                <div className="text-gray-400 text-[10px]">Delivery</div>
                <div className="font-bold text-blue-600">{report.delivery_score}/10</div>
              </div>
              <div className="flex-1 bg-gray-50 py-2 rounded-lg border">
                <div className="text-gray-400 text-[10px]">Language</div>
                <div className="font-bold text-green-600">{report.language_score}/10</div>
              </div>
              <div className="flex-1 bg-gray-50 py-2 rounded-lg border">
                <div className="text-gray-400 text-[10px]">Topic</div>
                <div className="font-bold text-purple-600">{report.topic_score}/10</div>
              </div>
            </div>
          </div>
          
          {/* AI Summary - Gradient Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-2xl shadow-lg text-white lg:col-span-2">
            <div className="flex items-start gap-5">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
                <Sparkles className="text-yellow-300" fill="currentColor" size={24} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-3">AI Summary</h3>
                <p className="text-white font-medium leading-relaxed text-xl">
                  {report.overall_summary}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Interactive Sentence Analysis */}
        <div className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="p-6 border-b bg-gray-50/50">
            <h3 className="font-bold text-gray-800 text-lg">📝 逐句分析</h3>
            <p className="text-sm text-gray-500 mt-1">点击句子展开详细反馈</p>
          </div>
          
          <div className="divide-y">
            {report.sentence_analyses.map((sentence: any, idx: number) => (
              <SentenceCard 
                key={idx} 
                sentence={sentence} 
                index={idx}
              />
            ))}
          </div>
        </div>
        
        {/* Actionable Tips */}
        <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 mb-8">
          <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
            <Star className="text-blue-600" size={20} />
            🎯 行动建议
          </h3>
          <ul className="space-y-3">
            {report.actionable_tips.map((tip: string, i: number) => (
              <li key={i} className="flex gap-3">
                <span className="text-blue-600 font-bold">{i + 1}.</span>
                <span className="text-gray-700">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Practice Again Button */}
        <div className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none z-20">
          <button 
            onClick={backToHome}
            className="pointer-events-auto flex items-center gap-2 px-8 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-lg"
          >
            <RefreshCcw size={18} />
            Practice Again
          </button>
        </div>
      </div>
    );
  };

  // Side Navigation (Unchanged)
  const Sidebar = () => (
    <div className="w-20 bg-gray-900 flex flex-col items-center py-8 z-30 h-screen fixed left-0 top-0 border-r border-gray-800">
      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mb-10 shadow-lg shadow-blue-500/30">
        <span className="text-white font-bold text-xl">T</span>
      </div>
      <nav className="flex-1 flex flex-col gap-6 w-full px-2">
        <NavItem icon={<Home size={20} />} disabled />
        <NavItem icon={<BookOpen size={20} />} active />
        <NavItem icon={<BarChart2 size={20} />} disabled />
      </nav>
      <div className="mt-auto pb-4">
        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer">
           <User size={20} />
        </div>
      </div>
    </div>
  );

  const NavItem = ({ icon, active, disabled }: { icon: React.ReactNode; active?: boolean; disabled?: boolean }) => (
    <button 
      disabled={disabled}
      className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 ${
        disabled 
          ? 'bg-gray-800/30 text-gray-600 cursor-not-allowed opacity-40' 
          : active 
            ? 'bg-gray-800 text-blue-400 border border-gray-700' 
            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
      }`}
    >
      {icon}
    </button>
  );

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
             // Normalize step index for visual 4-step progress
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
          {currentStep === 'detail' && renderDetail()}
          {(currentStep === 'prep_tts' || currentStep === 'prep_countdown') && renderPrep()}
          {currentStep === 'recording' && renderRecording()}
          {currentStep === 'confirmation' && renderConfirmation()}
          {currentStep === 'analyzing' && renderAnalyzing()}
          {currentStep === 'report' && renderReport()}
        </div>
      </main>
    </div>
  );
};

export default App;