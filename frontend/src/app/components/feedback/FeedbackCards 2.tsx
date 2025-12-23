import React from 'react';
import { 
  Volume2, AlertTriangle, Lightbulb, Star, Target, 
  CheckCircle, ThumbsUp, Sparkles, Copy
} from 'lucide-react';
import type { 
  PronunciationIssue, GrammarIssue, ExpressionSuggestion, 
  ActionableTip 
} from '../../../services/api';

// Color scheme for different feedback types
const feedbackColors = {
  pronunciation: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-900',
    badge: 'bg-blue-100 text-blue-700',
    icon: 'text-blue-600'
  },
  grammar: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-900',
    badge: 'bg-red-100 text-red-700',
    icon: 'text-red-600'
  },
  expression: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-900',
    badge: 'bg-green-100 text-green-700',
    icon: 'text-green-600'
  },
  tips: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-900',
    badge: 'bg-purple-100 text-purple-700',
    icon: 'text-purple-600'
  },
  strengths: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-900',
    badge: 'bg-amber-100 text-amber-700',
    icon: 'text-amber-600'
  }
};

// Pronunciation Section Component
export const PronunciationSection: React.FC<{ issues: PronunciationIssue[] }> = ({ issues }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Volume2 className={`w-5 h-5 ${feedbackColors.pronunciation.icon}`} />
        <h4 className={`font-semibold ${feedbackColors.pronunciation.text}`}>
          发音问题 ({issues.length}个)
        </h4>
      </div>
      
      <div className="space-y-3">
        {issues.map((issue, idx) => (
          <div 
            key={idx}
            className={`rounded-xl border-2 ${feedbackColors.pronunciation.border} ${feedbackColors.pronunciation.bg} p-4 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl font-bold text-gray-900">{issue.word}</span>
                  {issue.timestamp && (
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                      {issue.timestamp.toFixed(1)}s
                    </span>
                  )}
                </div>
                
                <div className="space-y-2 mb-3">
                  {issue.your_pronunciation && (
                    <div className="flex items-center gap-2">
                      <span className="text-red-500 text-sm">❌</span>
                      <span className="text-sm text-gray-700">
                        你的发音: <span className="font-mono bg-white px-2 py-1 rounded">{issue.your_pronunciation}</span>
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <span className="text-green-500 text-sm">✅</span>
                    <span className="text-sm text-gray-700">
                      正确发音: <span className="font-mono bg-white px-2 py-1 rounded font-semibold">{issue.correct_pronunciation}</span>
                    </span>
                  </div>
                </div>
                
                <div className={`${feedbackColors.pronunciation.badge} rounded-lg p-3 text-sm`}>
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{issue.tip}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Grammar Section Component
export const GrammarSection: React.FC<{ issues: GrammarIssue[] }> = ({ issues }) => {
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className={`w-5 h-5 ${feedbackColors.grammar.icon}`} />
        <h4 className={`font-semibold ${feedbackColors.grammar.text}`}>
          语法问题 ({issues.length}个)
        </h4>
      </div>
      
      <div className="space-y-3">
        {issues.map((issue, idx) => (
          <div 
            key={idx}
            className={`rounded-xl border-2 ${feedbackColors.grammar.border} ${feedbackColors.grammar.bg} p-4 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-start justify-between mb-2">
              <span className={`text-xs font-semibold ${feedbackColors.grammar.badge} px-3 py-1 rounded-full`}>
                {issue.error_type}
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3 border border-red-200">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">原句</div>
                    <div className="text-sm text-gray-900 leading-relaxed">
                      {issue.original} <span className="text-red-500">❌</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-3 border-2 border-green-500">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-xs text-green-600 font-semibold mb-1">改正</div>
                    <div className="text-sm text-gray-900 font-medium leading-relaxed">
                      {issue.corrected} <span className="text-green-500">✅</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy(issue.corrected)}
                    className="p-1.5 hover:bg-green-100 rounded transition-colors"
                    title="复制"
                  >
                    <Copy className="w-4 h-4 text-green-600" />
                  </button>
                </div>
              </div>
              
              <div className={`${feedbackColors.grammar.badge} rounded-lg p-3 text-sm`}>
                <strong>说明：</strong> {issue.explanation}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Expression Section Component
export const ExpressionSection: React.FC<{ suggestions: ExpressionSuggestion[] }> = ({ suggestions }) => {
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className={`w-5 h-5 ${feedbackColors.expression.icon}`} />
        <h4 className={`font-semibold ${feedbackColors.expression.text}`}>
          表达优化 ({suggestions.length}个)
        </h4>
      </div>
      
      <div className="space-y-4">
        {suggestions.map((suggestion, idx) => (
          <div 
            key={idx}
            className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full font-semibold">
                Native Speaker Version
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Student Version */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-500 mb-2">你的表达</div>
                <div className="text-lg font-medium text-gray-900">"{suggestion.original}"</div>
              </div>
              
              {/* Native Version */}
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg p-4 text-white relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 fill-yellow-300 text-yellow-300" />
                    <div className="text-xs text-green-100">推荐表达</div>
                  </div>
                  <button
                    onClick={() => handleCopy(suggestion.improved)}
                    className="p-1.5 hover:bg-white/20 rounded transition-colors"
                    title="复制"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-lg font-bold">"{suggestion.improved}"</div>
                <div className="absolute top-2 right-2">
                  <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full font-bold">
                    POLISHED
                  </span>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-green-800 bg-green-100 rounded-lg p-3">
              <strong>为什么更好：</strong> {suggestion.reason}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Notes Section Component (for fluency and content notes)
export const NotesSection: React.FC<{ title: string; content: string }> = ({ title, content }) => {
  return (
    <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-gray-600" />
        <h4 className="font-semibold text-gray-900">{title}</h4>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{content}</p>
    </div>
  );
};

// Tips Section Component
export const TipsSection: React.FC<{ tips: ActionableTip[] }> = ({ tips }) => {
  const getCategoryColor = (category: string) => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes('发音') || lowerCategory.includes('pronunciation')) {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    if (lowerCategory.includes('语法') || lowerCategory.includes('grammar')) {
      return 'bg-red-100 text-red-700 border-red-200';
    }
    if (lowerCategory.includes('词汇') || lowerCategory.includes('vocabulary')) {
      return 'bg-green-100 text-green-700 border-green-200';
    }
    if (lowerCategory.includes('结构') || lowerCategory.includes('structure')) {
      return 'bg-orange-100 text-orange-700 border-orange-200';
    }
    if (lowerCategory.includes('流利') || lowerCategory.includes('fluency')) {
      return 'bg-cyan-100 text-cyan-700 border-cyan-200';
    }
    return 'bg-purple-100 text-purple-700 border-purple-200';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Target className={`w-5 h-5 ${feedbackColors.tips.icon}`} />
        <h4 className={`font-semibold ${feedbackColors.tips.text}`}>
          可操作建议 ({tips.length}个)
        </h4>
      </div>
      
      <div className={`${feedbackColors.tips.bg} border-2 ${feedbackColors.tips.border} rounded-xl p-4`}>
        <div className="space-y-3">
          {tips.map((tip, idx) => (
            <div key={idx} className="flex items-start gap-3 bg-white rounded-lg p-3 hover:shadow-sm transition-shadow">
              <CheckCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${feedbackColors.tips.icon}`} />
              <div className="flex-1">
                <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full border mb-2 ${getCategoryColor(tip.category)}`}>
                  {tip.category}
                </span>
                <p className="text-sm text-gray-700 leading-relaxed">{tip.tip}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Strengths Section Component
export const StrengthsSection: React.FC<{ strengths: string[] }> = ({ strengths }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <ThumbsUp className={`w-5 h-5 ${feedbackColors.strengths.icon}`} />
        <h4 className={`font-semibold ${feedbackColors.strengths.text}`}>
          做得好的地方 💪
        </h4>
      </div>
      
      <div className={`${feedbackColors.strengths.bg} border-2 ${feedbackColors.strengths.border} rounded-xl p-4`}>
        <div className="space-y-2">
          {strengths.map((strength, idx) => (
            <div key={idx} className="flex items-start gap-3 bg-white rounded-lg p-3">
              <Star className={`w-5 h-5 mt-0.5 flex-shrink-0 fill-yellow-400 text-yellow-400`} />
              <p className="text-sm text-gray-700 leading-relaxed flex-1">{strength}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

