import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  AlertCircle, RefreshCcw, 
  Sparkles, ChevronDown, ChevronUp,
  Volume2, BookOpen, Play, Pause,
  Mic, MessageSquare, Target
} from 'lucide-react';
import type { AnalysisResponse, ChunkAnalysis, ReportJSONV2, ViewpointExtensions } from '../../services/api';
import {
  ChunkFeedbackCoach
} from '../components/feedback';

// Score dimension card component with progress bar
interface ScoreDimensionCardProps {
  icon: React.ReactNode;
  title: string;
  score: number;
  maxScore: number;
  colorClass: string;
  bgGradient: string;
  progressColor: string;
  textColor: string;
  description: string;
  isExpanded: boolean;
  onToggle: () => void;
}

const ScoreDimensionCard: React.FC<ScoreDimensionCardProps> = ({
  icon,
  title,
  score,
  maxScore,
  colorClass,
  bgGradient,
  progressColor,
  textColor,
  description,
  isExpanded,
  onToggle
}) => {
  const percentage = (score / maxScore) * 100;
  
  // Get preview text (first 60 characters)
  const getPreviewText = (text: string) => {
    if (text.length <= 60) return text;
    return text.substring(0, 60) + '...';
  };
  
  return (
    <div 
      className={`rounded-2xl border-2 overflow-hidden transition-all duration-300 ${bgGradient} ${
        isExpanded 
          ? 'border-blue-400 shadow-2xl z-10' 
          : 'border-gray-100 hover:border-blue-200 hover:shadow-lg'
      }`}
      style={{
        transform: isExpanded ? 'scale(1.02)' : 'scale(1)',
        zIndex: isExpanded ? 10 : 1
      }}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
              {icon}
            </div>
            <span className="font-semibold text-gray-800 text-lg">{title}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold ${textColor}`}>
              {score}
            </span>
            <span className="text-gray-400 text-sm">/{maxScore}</span>
          </div>
        </div>
        
        {/* Progress Bar - Light background with dark fill for contrast */}
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-4">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        {/* Content Preview */}
        <div className="space-y-3">
          <p className={`text-gray-600 text-sm leading-relaxed transition-all duration-300 ${
            isExpanded ? 'opacity-100' : 'opacity-90'
          }`}>
            {isExpanded ? description : getPreviewText(description)}
          </p>
          
          {/* Expand/Collapse Button - Centered */}
          <div className="flex justify-center pt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className={`flex items-center gap-2 text-sm font-semibold transition-all duration-200 ${
                isExpanded 
                  ? 'text-gray-500 hover:text-gray-700' 
                  : `${textColor.replace('text-', 'text-')} hover:opacity-80`
              }`}
            >
              <span>{isExpanded ? '收起' : '展开更多'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Viewpoint Extensions Section Component
interface ViewpointExtensionsSectionProps {
  extensions: ViewpointExtensions;
}

const ViewpointExtensionsSection: React.FC<ViewpointExtensionsSectionProps> = ({ extensions }) => {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 border-2 border-blue-100">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <Sparkles size={20} className="text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-800">思维拓展</h3>
          <p className="text-sm text-gray-600">基于你的立场，这里有更多支持性观点供参考</p>
        </div>
      </div>

      {/* User Stance */}
      <div className="mb-6 p-4 bg-white rounded-xl border border-blue-200">
        <span className="text-sm font-medium text-gray-600">你的立场：</span>
        <span className="ml-2 text-gray-800">{extensions.user_stance}</span>
      </div>

      {/* Extensions Grid */}
      <div className="grid grid-cols-1 gap-4">
        {extensions.extensions.map((ext, index) => (
          <div 
            key={index}
            className="p-5 rounded-xl border-2 bg-white border-blue-200 transition-all hover:shadow-md hover:border-blue-300"
          >
            {/* Dimension Badge */}
            <div className="flex items-center gap-2 mb-3">
              <Target size={18} className="text-blue-600" />
              <span className="text-sm font-semibold text-gray-700">
                观点 {index + 1}: {ext.dimension}
              </span>
            </div>
            
            {/* Viewpoint Text */}
            <p className="text-gray-700 leading-relaxed text-[15px]">
              {ext.viewpoint_text}
            </p>
          </div>
        ))}
      </div>

      {/* Tip */}
      <div className="mt-6 p-4 bg-white/60 rounded-xl border border-blue-200">
        <p className="text-sm text-gray-600 leading-relaxed">
          💡 <span className="font-medium">使用建议：</span>这些观点来自不同维度，可以帮助你在下次遇到类似题目时，快速构建更全面的论证。建议记住其中的关键短语和例子。
        </p>
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
  recordingBlobUrl: string | null;
}

export const ReportPage: React.FC<ReportPageProps> = ({
  analysisReport,
  expandedSentenceId,
  setExpandedSentenceId,
  onBackToHome,
  recordingBlobUrl,
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
  
  // State for chunk expansion
  const [expandedChunkId, setExpandedChunkId] = useState<number | null>(null);
  
  // State for score dimension card expansion
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null);
  
  // Recording player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeChunkId, setActiveChunkId] = useState<number | null>(null);
  
  // Playback speed state
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const speedOptions = [0.8, 1.0, 1.2];
  
  // Chunk playback end time - when playing a specific chunk, stop at this time
  const chunkEndTimeRef = useRef<number | null>(null);
  
  // Calculate expected duration from chunks (for mock mode fallback)
  const chunkBasedDuration = report.chunks?.length > 0 
    ? Math.max(...report.chunks.map(c => c.time_range[1])) 
    : 45;
  
  // Initialize audio element
  useEffect(() => {
    if (recordingBlobUrl) {
      const audio = new Audio(recordingBlobUrl);
      audio.preload = 'metadata';

      audio.addEventListener('loadedmetadata', () => {
        if (isFinite(audio.duration) && audio.duration > 1) {
          setDuration(audio.duration);
        } else {
          // Use chunk-based duration for mock/short audio
          setDuration(chunkBasedDuration);
        }
      });

      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
        
        // Check if we need to stop at chunk end time
        if (chunkEndTimeRef.current !== null && audio.currentTime >= chunkEndTimeRef.current) {
          audio.pause();
          setIsPlaying(false);
          chunkEndTimeRef.current = null; // Reset after stopping
        }
        
        // Find active chunk based on current time
        if (report.chunks) {
          const activeChunk = report.chunks.find(
            chunk => audio.currentTime >= chunk.time_range[0] && audio.currentTime < chunk.time_range[1]
          );
          setActiveChunkId(activeChunk?.chunk_id ?? null);
        }
      });

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setActiveChunkId(null);
      });

      audioRef.current = audio;

      return () => {
        audio.pause();
        audio.src = '';
      };
    } else if (report.chunks?.length > 0) {
      // No audio URL but have chunks - use chunk duration for UI preview
      setDuration(chunkBasedDuration);
    }
  }, [recordingBlobUrl, report.chunks, chunkBasedDuration]);
  
  // Play/pause toggle (clears chunk end time to allow full playback)
  const togglePlay = async () => {
    if (!audioRef.current) return;
    
    // Clear any chunk end time limit when using global play button
    chunkEndTimeRef.current = null;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Failed to play audio:', error);
      }
    }
  };
  
  // Seek to time
  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };
  
  // Change playback speed
  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };
  
  // Play chunk from its start time and stop at its end time
  const playChunkFromTime = async (chunk: ChunkAnalysis) => {
    if (!audioRef.current) return;
    
    // Set the end time to stop playback
    chunkEndTimeRef.current = chunk.time_range[1];
    
    audioRef.current.currentTime = chunk.time_range[0];
    setCurrentTime(chunk.time_range[0]);
    
    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Failed to play chunk:', error);
    }
  };
  
  // Format time helper
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Extract data from V2 structure
  const totalScore = report.global_evaluation.total_score;
  const level = report.global_evaluation.level;
  const deliveryScore = report.global_evaluation.score_breakdown.delivery;
  const languageScore = report.global_evaluation.score_breakdown.language_use;
  const topicScore = report.global_evaluation.score_breakdown.topic_development;
  const overallSummary = report.global_evaluation.overall_summary;
  
  // Parse detailed feedback into three dimensions
  const parseDetailedFeedback = (feedback: string) => {
    const deliveryMatch = feedback.match(/表达.*?(?=语言使用|$)/s);
    const languageMatch = feedback.match(/语言使用.*?(?=话题展开|$)/s);
    const topicMatch = feedback.match(/话题展开.*$/s);
    
    // Clean up the text - remove markdown bold markers and dimension headers
    const cleanText = (text: string | undefined) => {
      if (!text) return '';
      return text
        .replace(/\*\*/g, '') // Remove markdown bold markers (keep content)
        .replace(/^[^)]+\)\s*/, '') // Remove "表达 (Delivery) " prefix
        .trim();
    };
    
    return {
      delivery: cleanText(deliveryMatch?.[0]) || '语速适中，发音清晰。',
      language: cleanText(languageMatch?.[0]) || '词汇使用恰当，句式有一定变化。',
      topic: cleanText(topicMatch?.[0]) || '回答结构清晰，论点有支撑。'
    };
  };
  
  const dimensionFeedback = parseDetailedFeedback(report.global_evaluation.detailed_feedback || '');
  
  // Chunk handlers (V2)
  const toggleChunk = (chunkId: number) => {
    setExpandedChunkId(prev => prev === chunkId ? null : chunkId);
  };
  
  // Chunk type labels and colors
  const getChunkTypeLabel = (chunk: ChunkAnalysis) => {
    const labels: Record<string, string> = {
      'opening_statement': '开头语',
      'viewpoint': `观点 ${chunk.chunk_id}`,
      'closing_statement': '总结'
    };
    return labels[chunk.chunk_type] || `段落 ${chunk.chunk_id + 1}`;
  };
  
  const getChunkTypeColor = (chunkType: string) => {
    const colors: Record<string, string> = {
      'opening_statement': 'bg-purple-100 text-purple-700 border-purple-200',
      'viewpoint': 'bg-blue-100 text-blue-700 border-blue-200',
      'closing_statement': 'bg-emerald-100 text-emerald-700 border-emerald-200'
    };
    return colors[chunkType] || colors.viewpoint;
  };

  // Render a single chunk card inline
  const renderChunkCard = (chunk: ChunkAnalysis) => {
    const isExpanded = expandedChunkId === chunk.chunk_id;
    const isActive = activeChunkId === chunk.chunk_id;

    // Debug: Log chunk data
    console.log(`Chunk ${chunk.chunk_id} - cloned_audio_url:`, chunk.cloned_audio_url ? 'Available' : 'Not available');

    // Handle card click - play this chunk
    const handleCardClick = () => {
      playChunkFromTime(chunk);
    };

    const isCurrentlyPlaying = isActive && isPlaying;
    
    return (
      <div 
        key={chunk.chunk_id}
        className={`bg-white rounded-xl border-2 overflow-hidden transition-all cursor-pointer relative ${
          isCurrentlyPlaying 
            ? 'border-blue-500 ring-2 ring-blue-300 shadow-lg shadow-blue-100' 
            : isActive 
              ? 'border-blue-400 ring-1 ring-blue-200' 
              : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
        }`}
        onClick={handleCardClick}
      >
        {/* Pulsing border animation when playing */}
        {isCurrentlyPlaying && (
          <div className="absolute inset-0 rounded-xl border-2 border-blue-400 animate-pulse pointer-events-none" />
        )}
        
        <div className={`p-4 border-b transition-colors ${
          isCurrentlyPlaying 
            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' 
            : isActive 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getChunkTypeColor(chunk.chunk_type)}`}>
                {getChunkTypeLabel(chunk)}
              </span>
              <span className="text-sm text-gray-500">
                {formatTime(chunk.time_range[0])} - {formatTime(chunk.time_range[1])}
              </span>
              {/* Play indicator with sound wave animation */}
              {isCurrentlyPlaying && (
                <span className="flex items-center gap-1.5 text-blue-600 text-sm font-medium bg-blue-100 px-2 py-0.5 rounded-full">
                  <span className="flex items-center gap-0.5">
                    <span className="w-0.5 h-3 bg-blue-500 rounded-full animate-[soundwave_0.5s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }} />
                    <span className="w-0.5 h-4 bg-blue-500 rounded-full animate-[soundwave_0.5s_ease-in-out_infinite]" style={{ animationDelay: '150ms' }} />
                    <span className="w-0.5 h-2 bg-blue-500 rounded-full animate-[soundwave_0.5s_ease-in-out_infinite]" style={{ animationDelay: '300ms' }} />
                  </span>
                  播放中
                </span>
              )}
            </div>

            {/* Expand/Collapse button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleChunk(chunk.chunk_id);
              }}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              title={isExpanded ? '收起详情' : '展开详情'}
            >
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className={`p-4 border-b transition-colors ${
          isCurrentlyPlaying ? 'bg-blue-50/70 border-blue-100' : 'bg-blue-50 border-blue-100'
        }`}>
          <p className="text-gray-800 leading-relaxed">
            {chunk.text}
          </p>
        </div>

        {isExpanded && (
          <div className="p-6 bg-white">
            <ChunkFeedbackCoach
              feedback={chunk.feedback_structured}
              clonedAudioUrl={chunk.cloned_audio_url}
              chunkId={chunk.chunk_id}
            />
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="w-full max-w-6xl mx-auto h-full overflow-y-auto pb-24">
      {/* Score Card + Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Score Card - Enhanced with shadow and gradient */}
        <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl shadow-lg border border-gray-100 lg:col-span-1 flex flex-col items-center">
          <div className="text-gray-400 text-xs font-bold uppercase mb-4 tracking-wider self-start">ETS 预估分数</div>
          <div className="relative flex justify-center my-2">
            <svg className="w-40 h-40 transform -rotate-90">
              <circle cx="80" cy="80" r="70" stroke="#e2e8f0" strokeWidth="10" fill="transparent" />
              <circle 
                cx="80" cy="80" r="70" 
                stroke="url(#scoreGradient)" 
                strokeWidth="10" 
                fill="transparent"
                strokeDasharray={`${(totalScore/30)*440} 440`}
                strokeLinecap="round"
                className="drop-shadow-sm"
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold bg-gradient-to-br from-blue-600 to-purple-600 bg-clip-text text-transparent">{totalScore}</span>
              <span className="text-xs text-white font-bold bg-gradient-to-r from-blue-500 to-purple-500 px-3 py-1 rounded-full mt-2 uppercase shadow-md">
                {level}
              </span>
            </div>
          </div>
        </div>
        
        {/* AI Summary - Enhanced Gradient Card */}
        <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700 p-8 rounded-2xl shadow-xl text-white lg:col-span-2 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="flex items-start gap-5 relative z-10">
            <div className="p-3 bg-white/15 rounded-xl backdrop-blur-md border border-white/20 shadow-lg">
              <Sparkles className="text-yellow-300" fill="currentColor" size={24} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-3">AI 总结</h3>
              <p className="text-white font-medium leading-relaxed text-lg">
                {overallSummary}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Three Score Dimension Cards with Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 px-2">
        <ScoreDimensionCard
          icon={<Mic className="w-6 h-6 text-blue-600" />}
          title="表达 Delivery"
          score={deliveryScore}
          maxScore={4}
          colorClass="bg-blue-100"
          bgGradient="bg-gradient-to-br from-blue-50 to-white"
          progressColor="bg-blue-500"
          textColor="text-blue-600"
          description={dimensionFeedback.delivery}
          isExpanded={expandedDimension === 'delivery'}
          onToggle={() => setExpandedDimension(prev => prev === 'delivery' ? null : 'delivery')}
        />
        <ScoreDimensionCard
          icon={<MessageSquare className="w-6 h-6 text-emerald-600" />}
          title="语言 Language"
          score={languageScore}
          maxScore={4}
          colorClass="bg-emerald-100"
          bgGradient="bg-gradient-to-br from-emerald-50 to-white"
          progressColor="bg-emerald-500"
          textColor="text-emerald-600"
          description={dimensionFeedback.language}
          isExpanded={expandedDimension === 'language'}
          onToggle={() => setExpandedDimension(prev => prev === 'language' ? null : 'language')}
        />
        <ScoreDimensionCard
          icon={<Target className="w-6 h-6 text-purple-600" />}
          title="主题 Topic"
          score={topicScore}
          maxScore={4}
          colorClass="bg-purple-100"
          bgGradient="bg-gradient-to-br from-purple-50 to-white"
          progressColor="bg-purple-500"
          textColor="text-purple-600"
          description={dimensionFeedback.topic}
          isExpanded={expandedDimension === 'topic'}
          onToggle={() => setExpandedDimension(prev => prev === 'topic' ? null : 'topic')}
        />
      </div>
      
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

          {/* Recording Player - Enhanced with chunk markers and speed control */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 p-5 mb-4 shadow-lg">
            <div className="flex items-center gap-4">
              {/* Play/Pause Button */}
              <button
                onClick={togglePlay}
                disabled={!recordingBlobUrl}
                className={`w-14 h-14 rounded-full text-white flex items-center justify-center transition-all shadow-lg flex-shrink-0 ${
                  recordingBlobUrl 
                    ? 'bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 cursor-pointer hover:scale-105' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
                title={!recordingBlobUrl ? '无可用音频' : undefined}
              >
                {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
              </button>
              
              {/* Progress Section */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Your Recording
                    {!recordingBlobUrl && <span className="text-amber-500 ml-2">(预览模式)</span>}
                  </span>
                  
                  {/* Speed Control */}
                  <div className="flex items-center gap-1 bg-gray-100 rounded-full p-0.5">
                    {speedOptions.map((speed) => (
                      <button
                        key={speed}
                        onClick={() => changeSpeed(speed)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-all ${
                          playbackSpeed === speed
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {speed.toFixed(1)}x
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Progress Bar Row - bar + time display aligned */}
                <div className="flex items-center gap-3 pb-2">
                  {/* Progress Bar with Chunk Markers and Dividers */}
                  <div className="relative h-3 bg-gray-200 rounded-full overflow-visible flex-1">
                  {/* Chunk regions as background */}
                  {report.chunks.map((chunk, index) => (
                    <div
                      key={chunk.chunk_id}
                      className={`absolute top-0 h-full cursor-pointer transition-all ${
                        activeChunkId === chunk.chunk_id 
                          ? 'bg-blue-200' 
                          : index % 2 === 0 
                            ? 'bg-gray-100 hover:bg-blue-100' 
                            : 'bg-gray-150 hover:bg-blue-100'
                      }`}
                      style={{
                        left: `${(chunk.time_range[0] / duration) * 100}%`,
                        width: `${((chunk.time_range[1] - chunk.time_range[0]) / duration) * 100}%`,
                      }}
                      onClick={() => {
                        if (recordingBlobUrl) {
                          seekTo(chunk.time_range[0]);
                        } else {
                          setActiveChunkId(chunk.chunk_id);
                          setCurrentTime(chunk.time_range[0]);
                        }
                      }}
                      title={`段落 ${chunk.chunk_id + 1}: ${chunk.time_range[0].toFixed(1)}s - ${chunk.time_range[1].toFixed(1)}s`}
                    />
                  ))}
                  
                  {/* Divider lines between chunks */}
                  {report.chunks.slice(1).map((chunk) => (
                    <div
                      key={`divider-${chunk.chunk_id}`}
                      className="absolute top-0 h-full w-0.5 bg-gray-400 z-10"
                      style={{
                        left: `${(chunk.time_range[0] / duration) * 100}%`,
                      }}
                    />
                  ))}
                  
                  {/* Progress indicator */}
                  <div 
                    className="absolute top-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-100 shadow-sm"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                  
                  {/* Playhead indicator */}
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full shadow-md z-20 transition-all duration-100"
                    style={{ left: `calc(${duration > 0 ? (currentTime / duration) * 100 : 0}% - 8px)` }}
                  />
                  
                  {/* Clickable seek overlay */}
                  <div 
                    className="absolute inset-0 cursor-pointer z-30"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const percent = (e.clientX - rect.left) / rect.width;
                      const newTime = percent * duration;
                      if (recordingBlobUrl) {
                        seekTo(newTime);
                      } else {
                        setCurrentTime(newTime);
                        const activeChunk = report.chunks?.find(
                          chunk => newTime >= chunk.time_range[0] && newTime < chunk.time_range[1]
                        );
                        setActiveChunkId(activeChunk?.chunk_id ?? null);
                      }
                    }}
                  />
                  
                  {/* Chunk labels below progress bar - inside same container for alignment */}
                  <div className="absolute -bottom-2 left-0 right-0">
                    {report.chunks.map((chunk) => (
                      <span
                        key={`label-${chunk.chunk_id}`}
                        className={`absolute text-[10px] font-medium transition-colors ${
                          activeChunkId === chunk.chunk_id ? 'text-blue-600' : 'text-gray-400'
                        }`}
                        style={{
                          left: `${((chunk.time_range[0] + chunk.time_range[1]) / 2 / duration) * 100}%`,
                          transform: 'translateX(-50%)',
                        }}
                      >
                        {getChunkTypeLabel(chunk)}
                      </span>
                    ))}
                  </div>
                  </div>
                  
                  {/* Time Display - aligned with progress bar */}
                  <div className="flex-shrink-0 flex items-center gap-1 font-mono">
                    <span className="text-blue-600 font-semibold text-sm">{formatTime(currentTime)}</span>
                    <span className="text-gray-400 text-xs">/</span>
                    <span className="text-gray-400 text-sm">{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {report.chunks.map((chunk) => renderChunkCard(chunk))}
          </div>

          {/* Viewpoint Extensions Section */}
          {report.viewpoint_extensions && (
            <div className="mt-8">
              <ViewpointExtensionsSection extensions={report.viewpoint_extensions} />
            </div>
          )}
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

