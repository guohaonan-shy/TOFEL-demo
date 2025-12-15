import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Mic, Play, Square, Clock, ChevronRight, BarChart2, 
  CheckCircle2, AlertCircle, Settings, Home, BookOpen, 
  User, HelpCircle, RefreshCcw, Pause, RotateCcw, 
  ChevronDown, ChevronUp, Star, Zap, Volume2, Sparkles, ArrowRight
} from 'lucide-react';

// --- Mock Data ---

const QUESTION_DATA = {
  category: "Independent Task",
  title: "Gap Year",
  text: "Students should take a gap year before entering university to gain work experience.",
  question: "Do you agree or disagree with the following statement? Use specific reasons and examples to support your answer."
};

const SOS_CONTENT = {
  keywords: ["Financial Independence", "Career Clarity"],
  starter: "Personally, I believe taking a gap year is beneficial because..."
};

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

  // ---------------- Logic Controllers ----------------

  // Countdown Logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
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

  // Recording Waveform Animation
  useEffect(() => {
    let animationFrame: NodeJS.Timeout | null = null;
    if (currentStep === 'recording' && isTimerRunning && !isPaused) {
      const updateBars = () => {
        setAudioBars(prev => prev.map(() => Math.max(8, Math.random() * 48)));
      };
      const barInterval = setInterval(updateBars, 100);
      return () => clearInterval(barInterval);
    }
    return () => {};
  }, [currentStep, isTimerRunning, isPaused]);

  // Audio Player Progress (P4 & P5)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
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

  // P4.5 Analysis Auto-Progress
  useEffect(() => {
    if (currentStep === 'analyzing') {
      let stepIdx = 0;
      setAnalysisSteps([
        { id: 1, label: 'Transcription', status: 'pending' },
        { id: 2, label: 'Rating', status: 'pending' },
        { id: 3, label: 'Grammar Analysis', status: 'pending' },
        { id: 4, label: 'Generating Feedback', status: 'pending' }
      ]);
      
      const processStep = () => {
        setAnalysisSteps(prev => prev.map((s, i) => 
          i === stepIdx ? {...s, status: 'processing'} : s
        ));
        
        setTimeout(() => {
          setAnalysisSteps(prev => prev.map((s, i) => 
            i === stepIdx ? {...s, status: 'completed'} : s
          ));
          
          stepIdx++;
          if (stepIdx < 4) {
            setTimeout(processStep, 500);
          } else {
            setTimeout(() => setCurrentStep('report'), 800);
          }
        }, 1200);
      };
      
      setTimeout(processStep, 300);
    }
  }, [currentStep]);

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

  const startRecordingPhase = () => {
    // P2 -> P3
    setCurrentStep('recording');
    setTimeLeft(45);
    setIsTimerRunning(true);
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const restartPractice = () => {
    // Retry: Back to Prep
    setIsTimerRunning(false);
    setIsPaused(false);
    startPracticeFlow(); 
  };

  const finishRecording = () => {
    setIsTimerRunning(false);
    setCurrentStep('confirmation');
  };

  const submitForAnalysis = () => {
    setCurrentStep('analyzing');
    // Simulate Analysis Process
    const simulateAnalysis = () => {
      let stepIdx = 0;
      const interval = setInterval(() => {
        if (stepIdx < analysisSteps.length) {
          setAnalysisSteps(prev => prev.map((s, i) => i === stepIdx ? {...s, status: 'completed'} : s));
          stepIdx++;
        } else {
          clearInterval(interval);
          setCurrentStep('report');
        }
      }, 1000);
    };
    simulateAnalysis();
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
  const renderDetail = () => (
    <div className="flex flex-col items-center justify-center h-full max-w-3xl mx-auto w-full animate-in fade-in zoom-in-95 duration-300">
      
      {/* Question Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 w-full text-center mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
        <p className="text-sm text-gray-500 font-medium font-serif italic mb-6">
          {QUESTION_DATA.question}
        </p>
        <h2 className="text-2xl md:text-4xl font-bold text-gray-900 leading-tight">
          "{QUESTION_DATA.text}"
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
                  {SOS_CONTENT.keywords.map((kw, i) => (
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
                  "{SOS_CONTENT.starter}"
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

  // P2: Preparation Phase (TTS + Countdown)
  const renderPrep = () => (
    <div className="flex flex-col items-center h-full w-full max-w-4xl mx-auto pt-4 animate-in fade-in duration-500">
      
      {/* Question Fixed Top */}
      <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8 text-center opacity-90">
          <h2 className="text-xl font-bold text-gray-800">
          "{QUESTION_DATA.text}"
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
          "{QUESTION_DATA.text}"
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
  const renderReport = () => (
    <div className="w-full max-w-5xl mx-auto h-full overflow-y-auto pb-24 animate-in slide-in-from-bottom-8 duration-500 scroll-smooth">
      
      {/* Header */}
      <div className="flex items-end justify-between mb-8 pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Analysis Report</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-medium text-gray-500">Task 1: Gap Year</span>
            <span className="text-gray-300">•</span>
            <span className="text-sm text-gray-400">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
        <div className="text-right">
           {/* Placeholder for export/share */}
        </div>
      </div>

      {/* Section A: Score & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Score Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-1 flex flex-col items-center justify-center relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-indigo-500" />
          <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-6">ETS Estimated Score</div>
          <div className="relative mb-6">
             <svg className="w-36 h-36 transform -rotate-90">
               <circle cx="72" cy="72" r="64" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
               <circle cx="72" cy="72" r="64" stroke="#3b82f6" strokeWidth="8" fill="transparent" strokeDasharray={`${(23/30)*402} 402`} strokeLinecap="round" />
             </svg>
             <div className="absolute inset-0 flex flex-col items-center justify-center">
               <span className="text-5xl font-bold text-gray-900 tracking-tighter">{MOCK_REPORT.score}</span>
               <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded mt-1 uppercase">{MOCK_REPORT.level}</span>
             </div>
          </div>
          {/* Simple Radar/Tags */}
          <div className="w-full flex justify-between gap-2 text-center text-xs">
            {Object.entries(MOCK_REPORT.radar).map(([key, val]) => (
               <div key={key} className="flex-1 bg-gray-50 py-2 rounded-lg border border-gray-100">
                 <div className="text-gray-400 capitalize mb-0.5 text-[10px]">{key}</div>
                 <div className={`font-bold ${val === 'Good' ? 'text-green-600' : 'text-amber-600'}`}>{val}</div>
               </div>
            ))}
          </div>
        </div>

        {/* One-Liner Summary */}
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-2xl shadow-lg text-white lg:col-span-2 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-32 bg-white opacity-5 rounded-full transform translate-x-12 -translate-y-12 blur-3xl" />
          <div className="flex items-start gap-5 relative z-10">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
              <Sparkles className="text-yellow-300" fill="currentColor" size={24} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-3">AI Summary</h3>
              <p className="text-white font-medium leading-relaxed text-xl md:text-2xl">
                "{MOCK_REPORT.summary}"
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section B: Transcript & Polish (The "Ask AI" Interaction) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-24">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-gray-800 text-lg">Transcript & AI Feedback</h3>
          <p className="text-sm text-gray-500 mt-1">Review your response with native-level polish suggestions. Click a sentence to listen.</p>
        </div>
        
        {/* Audio Player - Placed inside Transcript section */}
        <div className="p-6 border-b border-gray-100 bg-blue-50/30">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleAudioPlay}
              className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-105 transition-all shrink-0"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} fill="currentColor" className="ml-1" />}
            </button>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Your Recording</span>
                <div className="text-xs font-mono text-gray-400">
                  <span className="text-blue-600 font-semibold">{formatTime(audioProgress)}</span>
                  <span className="mx-1">/</span>
                  <span>{formatTime(audioTotalTime)}</span>
                </div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden cursor-pointer" 
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percentage = x / rect.width;
                  setAudioProgress(percentage * audioTotalTime);
                }}
              >
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-100" 
                  style={{ width: `${(audioProgress / audioTotalTime) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-100">
          {MOCK_REPORT.transcript.map((item) => {
            const isExpanded = expandedSentenceId === item.id;
            const isCurrentlyPlaying = currentPlayingSentence === item.id;
            
            return (
            <div 
              key={item.id} 
              className={`group transition-all duration-300 ${
                isCurrentlyPlaying 
                  ? 'bg-blue-100 ring-2 ring-blue-400 ring-inset' 
                  : isExpanded 
                    ? 'bg-blue-50/30' 
                    : 'hover:bg-gray-50'
              }`}
            >
              <div 
                className="p-5 cursor-pointer"
                onClick={() => {
                  setExpandedSentenceId(isExpanded ? null : item.id);
                  if (!isExpanded) {
                    jumpToAudioTime(item.startTime);
                  }
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Status Indicator */}
                  <div className="mt-1.5 shrink-0">
                      {item.type === 'issue' && <AlertCircle size={18} className="text-amber-500" />}
                      {item.type === 'suggestion' && <Zap size={18} className="text-blue-500" />}
                      {item.type === 'good' && <CheckCircle2 size={18} className="text-green-500" />}
                  </div>

                  <div className="flex-1">
                    {/* Original Text */}
                    <p className={`text-lg leading-relaxed transition-colors ${
                      isCurrentlyPlaying 
                        ? 'text-blue-900 font-semibold' 
                        : item.type !== 'good' 
                          ? 'text-gray-800 font-medium' 
                          : 'text-gray-500'
                    }`}>
                      {item.original}
                    </p>

                    {/* Always Show AI Feedback (No Ask AI button) */}
                    {isExpanded && (
                      <div className="mt-4 animate-in slide-in-from-top-2 fade-in duration-300">
                        {item.type === 'suggestion' && item.improved && (
                          <div className="bg-white rounded-xl border border-blue-100 p-5 shadow-sm">
                             <div className="flex items-start gap-4 mb-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md">
                                  <Star size={14} fill="currentColor" />
                                </div>
                                <div className="flex-1">
                                  <div className="text-xs font-bold text-blue-600 uppercase mb-1 flex items-center gap-2">
                                    Native Speaker Version
                                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px]">Polished</span>
                                  </div>
                                  <p className="text-gray-900 font-serif text-lg leading-relaxed">{item.improved}</p>
                                </div>
                             </div>
                             <div className="pl-12 pt-2 border-t border-gray-50 mt-3">
                                <div className="text-xs font-bold text-gray-400 uppercase mb-3">💡 Why Better?</div>
                                <div className="space-y-3">
                                  {typeof item.reason === 'object' && item.reason !== null && (
                                    <>
                                      {item.reason.grammar && (
                                        <div>
                                          <div className="text-xs font-bold text-blue-600 mb-1">Grammar:</div>
                                          <div className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none">
                                            <ReactMarkdown>{item.reason.grammar}</ReactMarkdown>
                                          </div>
                                        </div>
                                      )}
                                      {item.reason.content && (
                                        <div>
                                          <div className="text-xs font-bold text-blue-600 mb-1">Content:</div>
                                          <div className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none">
                                            <ReactMarkdown>{item.reason.content}</ReactMarkdown>
                                          </div>
                                        </div>
                                      )}
                                      {item.reason.expression && (
                                        <div>
                                          <div className="text-xs font-bold text-blue-600 mb-1">Expression:</div>
                                          <div className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none">
                                            <ReactMarkdown>{item.reason.expression}</ReactMarkdown>
                                          </div>
                                        </div>
                                      )}
                                      {item.reason.tip && (
                                        <div className="mt-3 pt-3 border-t border-blue-50">
                                          <div className="text-xs font-bold text-indigo-600 mb-1 flex items-center gap-1">
                                            <Star size={12} className="fill-indigo-200" />
                                            Actionable Tip:
                                          </div>
                                          <div className="text-sm text-indigo-700 leading-relaxed bg-indigo-50 p-2 rounded-lg prose prose-sm max-w-none">
                                            <ReactMarkdown>{item.reason.tip}</ReactMarkdown>
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                             </div>
                          </div>
                        )}
                        {item.type === 'good' && (
                          <div className="bg-green-50 rounded-xl border border-green-100 p-5 shadow-sm">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shrink-0">
                                <CheckCircle2 size={16} />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-green-700 uppercase mb-1">Great Job!</div>
                                <p className="text-sm text-green-800 leading-relaxed">{item.reason}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Chevron */}
                  <div className={`mt-1 shrink-0 transition-colors ${
                    isCurrentlyPlaying ? 'text-blue-600' : 'text-gray-300'
                  }`}>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
              </div>
            </div>
          )})}
        </div>
      </div>

      {/* Section C: Loop (Fixed Bottom) */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none z-20">
        <div className="bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-gray-200 pointer-events-auto flex gap-3 pl-4 pr-4"> 
          <button 
            onClick={backToHome}
            className="flex items-center gap-2 px-8 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-lg transition-transform hover:-translate-y-1 active:translate-y-0"
          >
            <RefreshCcw size={18} />
            Practice Again
          </button>
          <div className="hidden md:flex items-center gap-3 px-4 text-sm text-gray-500">
            <span>Apply what you learned!</span>
          </div>
        </div>
      </div>

    </div>
  );

  // Side Navigation (Unchanged)
  const Sidebar = () => (
    <div className="w-20 bg-gray-900 flex flex-col items-center py-8 z-30 h-screen fixed left-0 top-0 border-r border-gray-800">
      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mb-10 shadow-lg shadow-blue-500/30">
        <span className="text-white font-bold text-xl">T</span>
      </div>
      <nav className="flex-1 flex flex-col gap-6 w-full px-2">
        <NavItem icon={<Home size={20} />} label="Home" disabled />
        <NavItem icon={<BookOpen size={20} />} label="Practice" active />
        <NavItem icon={<BarChart2 size={20} />} label="Stats" disabled />
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
          <span className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">{QUESTION_DATA.title}</span>
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