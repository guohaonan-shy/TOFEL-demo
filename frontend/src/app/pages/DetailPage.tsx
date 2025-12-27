import React, { useState } from 'react';
import { 
  AlertCircle, Zap, ChevronDown, ChevronUp, 
  Volume2, Sparkles, ArrowRight 
} from 'lucide-react';
import type { Question } from '../../services/api';
import { BorderBeam } from '@/components/ui/border-beam';
import { Particles } from '@/components/ui/particles';
import { MagicCard } from '@/components/ui/magic-card';

interface DetailPageProps {
  isLoadingQuestions: boolean;
  apiError: string | null;
  currentQuestion: Question | null;
  isSOSOpen: boolean;
  setIsSOSOpen: (open: boolean) => void;
  onStartPractice: () => void;
}

export const DetailPage: React.FC<DetailPageProps> = ({
  isLoadingQuestions,
  apiError,
  currentQuestion,
  isSOSOpen,
  setIsSOSOpen,
  onStartPractice,
}) => {
  const [isQuestionHovered, setIsQuestionHovered] = useState(false);
  if (isLoadingQuestions) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px-4rem)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (apiError || !currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px-4rem)]">
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
    <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-64px-4rem)] max-w-3xl mx-auto w-full overflow-hidden">
      {/* Background Particles */}
      <Particles
        className="absolute inset-0 -z-10"
        quantity={50}
        staticity={50}
        color="#93c5fd"
        size={0.5}
        refresh={false}
      />
      
      {/* Question Card */}
      <div 
        className="relative bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 w-full text-center mb-8 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
        onMouseEnter={() => setIsQuestionHovered(true)}
        onMouseLeave={() => setIsQuestionHovered(false)}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
        
        {isQuestionHovered && (
          <BorderBeam 
            size={100}
            duration={12}
            colorFrom="#3b82f6"
            colorTo="#8b5cf6"
            borderWidth={2}
          />
        )}
        
        <p className="text-sm text-gray-500 font-medium font-serif italic mb-6 relative z-10">
          Do you agree or disagree with the following statement? Use specific reasons and examples to support your answer.
        </p>
        <h2 className="text-2xl md:text-4xl font-bold text-gray-900 leading-tight relative z-10">
          "{currentQuestion.instruction}"
        </h2>
      </div>
      
      {/* SOS Capsule (Interaction Core) */}
      <div className="relative w-full flex flex-col items-center z-10">
        <button 
          onClick={() => setIsSOSOpen(!isSOSOpen)}
          className={`
            relative flex items-center gap-2 px-6 py-3 rounded-full shadow-lg transition-all duration-300
            ${isSOSOpen 
              ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-200 translate-y-0' 
              : 'bg-white text-gray-600 hover:bg-amber-50 hover:scale-105 active:scale-95 -translate-y-2 animate-pulse'}
          `}
          style={!isSOSOpen ? {
            boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.3), 0 10px 25px -5px rgb(0 0 0 / 0.1)'
          } : undefined}
        >
          <Zap size={18} className={isSOSOpen ? "fill-amber-700" : "text-amber-500 animate-pulse"} />
          <span className="font-bold">{isSOSOpen ? "Hide Hints" : "No Idea? / 没思路？"}</span>
          {isSOSOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {/* SOS Expanded Content */}
        {isSOSOpen && (
          <MagicCard
            className="mt-4 w-full max-w-2xl animate-in slide-in-from-top-4 duration-300 rounded-2xl"
            gradientSize={200}
            gradientColor="#fbbf24"
            gradientOpacity={0.3}
          >
            <div className="p-6 bg-white rounded-2xl shadow-xl border border-amber-100">
              <div className="flex items-start gap-4 mb-4 pb-4 border-b border-gray-50">
                <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                   <Sparkles size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Keywords & Ideas</h4>
                  <div className="flex flex-wrap gap-2">
                    {currentQuestion.sos_keywords.map((kw, i) => (
                      <span key={i} className="px-3 py-1.5 bg-amber-50 text-amber-800 text-sm font-semibold rounded-lg border border-amber-100 hover:bg-amber-100 transition-colors cursor-default">
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
          </MagicCard>
        )}
      </div>

      <div className="flex-1" /> {/* Spacer */}

      <button 
        onClick={onStartPractice}
        className="group relative mb-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg font-bold px-20 py-5 rounded-full shadow-lg shadow-blue-300/40 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-400/50 active:scale-95 flex items-center gap-3 overflow-hidden"
      >
        {/* 微妙的光泽扫过 */}
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        {/* 按钮内容 */}
        <span className="relative z-10">Start Practice</span>
        <ArrowRight size={22} className="relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
      </button>
    </div>
  );
};

export default DetailPage;
