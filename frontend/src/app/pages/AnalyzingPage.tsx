import React from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';

export interface AnalysisStep {
  id: number;
  label: string;
  status: 'pending' | 'processing' | 'completed';
}

interface AnalyzingPageProps {
  analysisSteps: AnalysisStep[];
}

export const AnalyzingPage: React.FC<AnalyzingPageProps> = ({
  analysisSteps,
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto animate-in zoom-in-95 duration-300">
      <div className="bg-white rounded-3xl p-10 shadow-xl border border-gray-100 w-full">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse">
          <Sparkles size={40} />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3 text-center">AI is Analyzing...</h2>
        <p className="text-gray-500 mb-10 text-lg text-center">Our advanced AI is processing your response. This usually takes 8-10 seconds.</p>

        {/* Analysis Progress */}
        <div className="space-y-4">
          {analysisSteps.map((step) => (
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
};

export default AnalyzingPage;
