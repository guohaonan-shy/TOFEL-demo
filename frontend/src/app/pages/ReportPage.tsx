import React from 'react';
import { 
  AlertCircle, CheckCircle2, RefreshCcw, 
  Star, Sparkles, Zap, ChevronDown 
} from 'lucide-react';
import type { AnalysisResponse } from '../../services/api';

// Sentence Card Component
interface SentenceCardProps {
  sentence: {
    original_text: string;
    native_version?: string;
    evaluation: string;
    grammar_feedback: string;
    expression_feedback: string;
    suggestion_feedback: string;
  };
  index: number;
  isExpanded: boolean;
  onToggleExpand: (index: number | null) => void;
}

const SentenceCard: React.FC<SentenceCardProps> = ({ 
  sentence, 
  index, 
  isExpanded,
  onToggleExpand,
}) => {
  const isGood = sentence.evaluation.includes('优秀');
  
  return (
    <div className={`group transition-all ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-gray-50'}`}>
      <div className="p-5 cursor-pointer" onClick={() => onToggleExpand(isExpanded ? null : index)}>
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

// Report Page Props
interface ReportPageProps {
  analysisReport: AnalysisResponse | null;
  expandedSentenceId: number | null;
  setExpandedSentenceId: (id: number | null) => void;
  onBackToHome: () => void;
}

export const ReportPage: React.FC<ReportPageProps> = ({
  analysisReport,
  expandedSentenceId,
  setExpandedSentenceId,
  onBackToHome,
}) => {
  if (!analysisReport?.report_json) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle size={48} className="text-amber-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Report Available</h3>
          <p className="text-gray-600 mb-4">The analysis report could not be loaded.</p>
          <button 
            onClick={onBackToHome}
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
              isExpanded={expandedSentenceId === idx}
              onToggleExpand={setExpandedSentenceId}
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
          onClick={onBackToHome}
          className="pointer-events-auto flex items-center gap-2 px-8 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-lg"
        >
          <RefreshCcw size={18} />
          Practice Again
        </button>
      </div>
    </div>
  );
};

export default ReportPage;
