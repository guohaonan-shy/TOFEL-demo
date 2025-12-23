import React from 'react';
import { Volume2 } from 'lucide-react';
import type { Question } from '../../services/api';

interface PrepPageProps {
  currentStep: 'prep_tts' | 'prep_countdown';
  currentQuestion: Question | null;
  timeLeft: number;
}

export const PrepPage: React.FC<PrepPageProps> = ({
  currentStep,
  currentQuestion,
  timeLeft,
}) => {
  return (
    <div className="flex flex-col items-center h-full w-full max-w-4xl mx-auto pt-4 animate-in fade-in duration-150">
      
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
};

export default PrepPage;
