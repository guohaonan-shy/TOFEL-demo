import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  AlertCircle, RefreshCcw, 
  Sparkles, ChevronDown, ChevronUp,
  Volume2, BookOpen
} from 'lucide-react';
import type { AnalysisResponse, ChunkAnalysis, ReportJSONV2 } from '../../services/api';
import {
  PronunciationSection,
  GrammarSection,
  ExpressionSection,
  NotesSection,
  TipsSection,
  StrengthsSection
} from '../components/feedback';

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
  
  const report = analysisReport.report_json as ReportJSONV2;
  
  // State for chunk expansion and audio playback
  const [expandedChunkId, setExpandedChunkId] = useState<number | null>(null);
  const [currentChunkAudio, setCurrentChunkAudio] = useState<HTMLAudioElement | null>(null);
  
  // Extract data from V2 structure
  const totalScore = report.global_evaluation.total_score;
  const level = report.global_evaluation.level;
  const deliveryScore = report.global_evaluation.score_breakdown.delivery;
  const languageScore = report.global_evaluation.score_breakdown.language_use;
  const topicScore = report.global_evaluation.score_breakdown.topic_development;
  const overallSummary = report.global_evaluation.overall_summary;
  
  // Chunk handlers (V2)
  const toggleChunk = (chunkId: number) => {
    setExpandedChunkId(prev => prev === chunkId ? null : chunkId);
  };
  
  const playChunkAudio = async (chunk: ChunkAnalysis) => {
    try {
      if (currentChunkAudio) {
        currentChunkAudio.pause();
        currentChunkAudio.currentTime = 0;
      }
      
      const audio = new Audio(chunk.audio_url);
      setCurrentChunkAudio(audio);
      
      audio.addEventListener('ended', () => {
        setCurrentChunkAudio(null);
      });
      
      await audio.play();
    } catch (error) {
      console.error('Failed to play chunk audio:', error);
    }
  };
  
  // ChunkCard Component
  const ChunkCard: React.FC<{chunk: ChunkAnalysis}> = ({ chunk }) => {
    const chunkTypeLabels: Record<string, string> = {
      'opening_statement': '开头语',
      'viewpoint': `观点 ${chunk.chunk_id}`
    };
    
    const chunkTypeColors: Record<string, string> = {
      'opening_statement': 'bg-purple-100 text-purple-700 border-purple-200',
      'viewpoint': 'bg-blue-100 text-blue-700 border-blue-200'
    };
    
    const isExpanded = expandedChunkId === chunk.chunk_id;

    return (
      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:border-blue-300 transition-all">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${chunkTypeColors[chunk.chunk_type] || chunkTypeColors.viewpoint}`}>
                {chunkTypeLabels[chunk.chunk_type] || `段落 ${chunk.chunk_id + 1}`}
              </span>
              <span className="text-sm text-gray-500">
                {chunk.time_range[0].toFixed(1)}s - {chunk.time_range[1].toFixed(1)}s
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => playChunkAudio(chunk)}
                className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                title="播放此段音频"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => toggleChunk(chunk.chunk_id)}
                className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <p className="text-gray-800 leading-relaxed">
            {chunk.text}
          </p>
        </div>

        {isExpanded && (
          <div className="p-6 bg-white space-y-6">
            {/* Overall Summary */}
            <div className="pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-gray-900">整体评价</h4>
              </div>
              <p className="text-gray-700 leading-relaxed">{chunk.feedback_structured.summary}</p>
            </div>

            {/* Pronunciation Issues */}
            {chunk.feedback_structured.pronunciation_issues && chunk.feedback_structured.pronunciation_issues.length > 0 && (
              <PronunciationSection issues={chunk.feedback_structured.pronunciation_issues} />
            )}

            {/* Grammar Issues */}
            {chunk.feedback_structured.grammar_issues.length > 0 && (
              <GrammarSection issues={chunk.feedback_structured.grammar_issues} />
            )}

            {/* Expression Suggestions */}
            {chunk.feedback_structured.expression_suggestions.length > 0 && (
              <ExpressionSection suggestions={chunk.feedback_structured.expression_suggestions} />
            )}

            {/* Fluency Notes */}
            {chunk.feedback_structured.fluency_notes && (
              <NotesSection title="流利度评价" content={chunk.feedback_structured.fluency_notes} />
            )}

            {/* Content Notes */}
            {chunk.feedback_structured.content_notes && (
              <NotesSection title="内容逻辑" content={chunk.feedback_structured.content_notes} />
            )}

            {/* Actionable Tips */}
            {chunk.feedback_structured.actionable_tips.length > 0 && (
              <TipsSection tips={chunk.feedback_structured.actionable_tips} />
            )}

            {/* Strengths */}
            {chunk.feedback_structured.strengths.length > 0 && (
              <StrengthsSection strengths={chunk.feedback_structured.strengths} />
            )}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="w-full max-w-5xl mx-auto h-full overflow-y-auto pb-24">
      {/* Score Card + Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Score Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border lg:col-span-1">
          <div className="text-gray-400 text-xs font-bold uppercase mb-6">ETS 预估分数</div>
          <div className="relative mb-6 flex justify-center">
            <svg className="w-36 h-36 transform -rotate-90">
              <circle cx="72" cy="72" r="64" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
              <circle 
                cx="72" cy="72" r="64" 
                stroke="#3b82f6" 
                strokeWidth="8" 
                fill="transparent"
                strokeDasharray={`${(totalScore/30)*402} 402`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold text-gray-900">{totalScore}</span>
              <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded mt-1 uppercase">
                {level}
              </span>
            </div>
          </div>
          
          {/* Component Scores */}
          <div className="flex justify-between gap-2 text-center text-xs">
            <div className="flex-1 bg-gray-50 py-2 rounded-lg border">
              <div className="text-gray-400 text-[10px]">表达</div>
              <div className="font-bold text-blue-600">{deliveryScore}/10</div>
            </div>
            <div className="flex-1 bg-gray-50 py-2 rounded-lg border">
              <div className="text-gray-400 text-[10px]">语言</div>
              <div className="font-bold text-green-600">{languageScore}/10</div>
            </div>
            <div className="flex-1 bg-gray-50 py-2 rounded-lg border">
              <div className="text-gray-400 text-[10px]">主题</div>
              <div className="font-bold text-purple-600">{topicScore}/10</div>
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
              <h3 className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-3">AI 总结</h3>
              <p className="text-white font-medium leading-relaxed text-xl">
                {overallSummary}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Global Detailed Feedback */}
      {report.global_evaluation.detailed_feedback && (
        <div className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
          <div className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 text-indigo-600 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">详细评价</h3>
              <div className="prose prose-sm max-w-none text-gray-600">
                <ReactMarkdown>{report.global_evaluation.detailed_feedback}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Chunk-based Analysis */}
      {report.chunks && report.chunks.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">逐段分析</h3>
            <span className="text-sm text-gray-500">
              ({report.chunks.length} 个段落)
            </span>
          </div>

          <div className="space-y-4">
            {report.chunks.map((chunk) => (
              <ChunkCard key={chunk.chunk_id} chunk={chunk} />
            ))}
          </div>
        </div>
      )}
      
      
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
