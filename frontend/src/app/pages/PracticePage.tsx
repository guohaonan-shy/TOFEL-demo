import React from 'react';
import { Volume2, Play, Pause, Square, RotateCcw } from 'lucide-react';
import type { Question } from '../../services/api';

// Practice phase: listening -> preparing -> recording
type PracticePhase = 'listening' | 'preparing' | 'recording';

interface PracticePageProps {
  phase: PracticePhase;
  currentQuestion: Question | null;
  timeLeft: number;
  isPaused: boolean;
  audioBars: number[];
  onTogglePause: () => void;
  onRestart: () => void;
  onFinish: () => void;
}

export const PracticePage: React.FC<PracticePageProps> = ({
  phase,
  currentQuestion,
  timeLeft,
  isPaused,
  audioBars,
  onTogglePause,
  onRestart,
  onFinish,
}) => {
  // Render the center content based on current phase
  const renderPhaseContent = () => {
    switch (phase) {
      case 'listening':
        // TTS playing state
        return (
          <div className="text-center animate-pulse">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500">
              <Volume2 size={40} />
            </div>
            <h3 className="text-xl font-semibold text-gray-700">Reading Instructions...</h3>
            <p className="text-gray-400 mt-2">Listen carefully</p>
          </div>
        );

      case 'preparing':
        // 15s countdown state
        return (
          <div className="text-center">
            <span className="inline-block px-4 py-1.5 bg-green-100 text-green-700 text-sm font-bold rounded-full mb-8 tracking-wide uppercase">
              Preparation Time
            </span>
            <div className="relative flex items-center justify-center">
              {/* Ring Progress */}
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
        );

      case 'recording':
        // Recording state with waveform and controls
        return (
          <div className="flex flex-col items-center w-full">
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
                onClick={onRestart}
                className="group flex flex-col items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <div className="w-14 h-14 rounded-full border-2 border-gray-200 flex items-center justify-center group-hover:border-gray-400 bg-white">
                  <RotateCcw size={20} />
                </div>
                <span className="text-xs font-medium">Restart</span>
              </button>

              <button 
                onClick={onTogglePause}
                className="flex flex-col items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors transform hover:scale-105 active:scale-95 duration-200"
              >
                <div className="w-20 h-20 rounded-full bg-white shadow-xl shadow-blue-100 border border-blue-50 flex items-center justify-center text-blue-600 ring-4 ring-blue-50">
                  {isPaused ? <Play size={36} className="ml-1.5" /> : <Pause size={36} />}
                </div>
                <span className="text-xs font-medium">{isPaused ? "Resume" : "Pause"}</span>
              </button>

              <button 
                onClick={onFinish}
                className="group flex flex-col items-center gap-2 text-gray-400 hover:text-red-600 transition-colors"
              >
                <div className="w-14 h-14 rounded-full border-2 border-red-100 bg-red-50 flex items-center justify-center text-red-500 group-hover:bg-red-100 group-hover:border-red-200">
                  <Square size={18} fill="currentColor" />
                </div>
                <span className="text-xs font-medium">Done</span>
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col items-center h-full w-full max-w-4xl mx-auto pt-4 animate-in fade-in duration-150">
      
      {/* Question Fixed Top - shared across all phases */}
      <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8 text-center opacity-90">
        <h2 className="text-xl font-bold text-gray-800">
          "{currentQuestion?.instruction || ''}"
        </h2>
      </div>
      
      {/* Phase Content - transitions smoothly */}
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        {renderPhaseContent()}
      </div>
    </div>
  );
};

export default PracticePage;

