import React from 'react';
import { Sparkles, CheckCircle, AlertTriangle, Volume2, Copy } from 'lucide-react';
import type { ChunkFeedbackStructured } from '../../../services/api';

// Coach Overview Component - 教练点评
export const CoachOverview: React.FC<{ overview: string }> = ({ overview }) => {
  return (
    <div className="pb-4 border-b border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-blue-600" />
        <h4 className="font-semibold text-gray-900">教练点评 (Coach's Comment)</h4>
      </div>
      <p className="text-gray-700 leading-relaxed">{overview}</p>
    </div>
  );
};

// Strengths and Weaknesses Two-Column Layout - 亮点 + 待提升
export const StrengthsAndWeaknesses: React.FC<{ 
  strengths: string[]; 
  weaknesses: string[];
}> = ({ strengths, weaknesses }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Strengths - 亮点 (Strengths) */}
      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <h4 className="font-semibold text-green-900">亮点 (Strengths)</h4>
        </div>
        <div className="space-y-2">
          {strengths.map((strength, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700 leading-relaxed">{strength}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Weaknesses - 待提升 (Areas for Improvement) */}
      <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <h4 className="font-semibold text-orange-900">待提升 (Areas for Improvement)</h4>
        </div>
        <div className="space-y-2">
          {weaknesses.map((weakness, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-orange-500 text-sm mt-0.5 flex-shrink-0">●</span>
              <p className="text-sm text-gray-700 leading-relaxed">{weakness}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Better Version Component - 改进版本
export const BetterVersion: React.FC<{ 
  correctedText: string;
  correctionExplanation: string;
  clonedAudioUrl?: string;
  chunkId: number;
}> = ({ 
  correctedText, 
  correctionExplanation, 
  clonedAudioUrl
}) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(correctedText);
  };

  return (
    <div className="bg-gray-100 border-2 border-gray-300 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900 uppercase tracking-wide text-sm">
          改进版本 (BETTER VERSION)
        </h4>
        <button
          onClick={handleCopy}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          title="复制改进版本"
        >
          <Copy className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Corrected Text */}
      <div className="bg-white rounded-lg p-4 mb-4 border border-gray-300">
        <p className="text-gray-900 leading-relaxed font-medium">
          "{correctedText}"
        </p>
      </div>

      {/* Coach's Explanation - 教练解读 */}
      <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h5 className="text-sm font-semibold text-blue-900 mb-1">教练解读：</h5>
            <p className="text-sm text-gray-700 leading-relaxed">{correctionExplanation}</p>
          </div>
        </div>
      </div>

      {/* Audio Player - 听听满分示例 (AI Voice Clone) */}
      {clonedAudioUrl && (
        <div className="bg-white rounded-lg p-4 border border-gray-300">
          <div className="flex items-center gap-2 mb-2">
            <Volume2 className="w-4 h-4 text-purple-600" />
            <h5 className="text-sm font-semibold text-gray-900">听听用自己声音讲出来的满分示例吧！ (AI Voice Clone)</h5>
          </div>
          <audio 
            key={clonedAudioUrl}
            controls 
            src={clonedAudioUrl}
            preload="auto"
            className="w-full"
            style={{ height: '40px' }}
          >
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  );
};

// Main Coach Feedback Component - 整合所有部分
export const ChunkFeedbackCoach: React.FC<{ 
  feedback: ChunkFeedbackStructured;
  clonedAudioUrl?: string;
  chunkId: number;
}> = ({ feedback, clonedAudioUrl, chunkId }) => {
  return (
    <div className="space-y-6">
      {/* Coach Overview */}
      <CoachOverview overview={feedback.overview} />

      {/* Strengths and Weaknesses */}
      <StrengthsAndWeaknesses 
        strengths={feedback.strengths} 
        weaknesses={feedback.weaknesses} 
      />

      {/* Better Version */}
      <BetterVersion 
        correctedText={feedback.corrected_text}
        correctionExplanation={feedback.correction_explanation}
        clonedAudioUrl={clonedAudioUrl}
        chunkId={chunkId}
      />
    </div>
  );
};

