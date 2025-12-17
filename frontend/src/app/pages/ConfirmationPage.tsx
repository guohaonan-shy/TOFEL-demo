import React, { useRef } from 'react';
import { CheckCircle2, Play, Pause } from 'lucide-react';

interface ConfirmationPageProps {
  isPlaying: boolean;
  audioProgress: number;
  audioTotalTime: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSubmit: () => void;
  onRestart: () => void;
  formatTime: (seconds: number) => string;
}

export const ConfirmationPage: React.FC<ConfirmationPageProps> = ({
  isPlaying,
  audioProgress,
  audioTotalTime,
  onTogglePlay,
  onSeek,
  onSubmit,
  onRestart,
  formatTime,
}) => {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressPercentage = audioTotalTime > 0 ? (audioProgress / audioTotalTime) * 100 : 0;
  
  // Handle click on progress bar to seek
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || audioTotalTime <= 0) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const seekTime = percentage * audioTotalTime;
    
    onSeek(Math.max(0, Math.min(seekTime, audioTotalTime)));
  };
  
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
             onClick={onTogglePlay}
             className="w-12 h-12 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center text-gray-700 hover:text-blue-600 hover:scale-105 transition-all"
           >
             {isPlaying ? <Pause size={20} /> : <Play size={20} fill="currentColor" className="ml-1" />}
           </button>
           <div className="flex-1">
             <div 
               ref={progressBarRef}
               onClick={handleProgressBarClick}
               className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2 cursor-pointer hover:bg-gray-300 transition-colors relative group"
             >
               <div 
                 className="h-full bg-blue-500 rounded-full transition-all duration-100 pointer-events-none" 
                 style={{ width: `${progressPercentage}%` }}
               ></div>
               {/* Seek indicator dot */}
               <div 
                 className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm pointer-events-none"
                 style={{ left: `calc(${progressPercentage}% - 6px)` }}
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
            onClick={onSubmit}
            className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5"
          >
            Submit for AI Analysis
          </button>

          {/* Secondary Action */}
          <button 
            onClick={onRestart}
            className="w-full py-4 rounded-xl border border-gray-200 text-gray-500 font-semibold hover:bg-gray-50 hover:text-gray-800 transition-colors"
          >
            Retry / 重录 (Discard)
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPage;
