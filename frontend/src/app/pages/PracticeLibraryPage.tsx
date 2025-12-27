/**
 * Practice Library Page
 * 
 * Displays a grid of available TOEFL speaking practice questions.
 * Users can search, filter by difficulty, and select topics to practice.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, ChevronRight, Sparkles } from 'lucide-react';
import { fetchQuestions, type Question } from '../../services/api';
import { Meteors } from '@/components/ui/meteors';
import { BorderBeam } from '@/components/ui/border-beam';

// Extended question type with UI metadata
interface QuestionWithMeta extends Question {
  displayTitle: string;
  description: string;
  displayDifficulty: 'EASY' | 'MEDIUM' | 'HARD';
  plays: number;
  displayTags: string[];
}

// Map to derive metadata from question content (using backend data when available)
const getQuestionMeta = (question: Question): QuestionWithMeta => {
  // Use backend title if available, otherwise fallback to instruction-based title
  let displayTitle = question.title || 'Speaking Topic';
  if (!question.title) {
    // Fallback: extract from instruction
    const words = question.instruction.split(' ').slice(0, 3);
    displayTitle = words.join(' ') + '...';
  }
  
  // Use backend difficulty if available, otherwise default to MEDIUM
  const displayDifficulty = question.difficulty || 'MEDIUM';
  
  // Use backend tags if available, otherwise use sos_keywords
  const displayTags = question.tags || question.sos_keywords?.slice(0, 2) || ['Speaking', 'TOEFL'];
  
  // Mock play count (can be replaced with real analytics later)
  const plays = Math.floor((question.question_id.charCodeAt(question.question_id.length - 1) * 17) % 1500) + 500;
  
  return {
    ...question,
    displayTitle,
    description: question.instruction,
    displayDifficulty,
    plays,
    displayTags,
  };
};

// Difficulty badge colors
const difficultyStyles = {
  EASY: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  MEDIUM: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  HARD: {
    bg: 'bg-rose-100',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
};

// Question Card Component
interface QuestionCardProps {
  question: QuestionWithMeta;
  onClick: () => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, onClick }) => {
  const difficultyStyle = difficultyStyles[question.displayDifficulty];
  const [isHovered, setIsHovered] = React.useState(false);
  
  return (
    <div 
      className="relative bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-7 shadow-sm hover:shadow-2xl hover:shadow-blue-200/40 hover:border-blue-300 hover:bg-white hover:-translate-y-2 active:scale-[0.98] transition-all duration-300 ease-out cursor-pointer group flex flex-col h-full overflow-hidden"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <BorderBeam 
          size={80}
          duration={8}
          colorFrom="#3b82f6"
          colorTo="#8b5cf6"
          borderWidth={2}
        />
      )}
      
      {/* Header: Difficulty */}
      <div className="flex items-start mb-4 relative z-10">
        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${difficultyStyle.bg} ${difficultyStyle.text} ${difficultyStyle.border} border shadow-sm`}>
          {question.displayDifficulty}
        </span>
      </div>
      
      {/* Title */}
      <h3 className="text-lg font-bold text-gray-900 mb-2.5 line-clamp-1 group-hover:text-blue-600 transition-colors duration-300 relative z-10">
        {question.displayTitle}
      </h3>
      
      {/* Description */}
      <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-loose flex-grow relative z-10">
        {question.description}
      </p>
      
      {/* Footer: Tags & Arrow */}
      <div className="flex items-center justify-between mt-auto relative z-10">
        <div className="flex items-center gap-2 flex-wrap">
          {question.displayTags.map((tag, index) => (
            <span 
              key={index} 
              className="px-3 py-1 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 text-xs font-medium rounded-full border border-gray-200/80 shadow-sm"
            >
              {tag}
            </span>
          ))}
        </div>
        <button className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 flex items-center justify-center group-hover:from-blue-600 group-hover:to-blue-700 group-hover:text-white group-hover:scale-110 group-hover:shadow-lg transition-all duration-300 flex-shrink-0 shadow-sm">
          <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform duration-300" />
        </button>
      </div>
    </div>
  );
};

// Coming Soon Card Component
const ComingSoonCard: React.FC = () => (
  <div className="relative overflow-hidden bg-gradient-to-br from-blue-50/80 via-purple-50/80 to-pink-50/80 backdrop-blur-sm rounded-2xl border-2 border-dashed border-blue-300/60 p-7 flex flex-col items-center justify-center h-full transition-all duration-300 ease-out hover:border-blue-400 hover:shadow-2xl hover:shadow-purple-200/40 hover:bg-gradient-to-br hover:from-blue-100/80 hover:via-purple-100/80 hover:to-pink-100/80 hover:-translate-y-2 hover:scale-[1.02] active:scale-[0.98] group cursor-pointer shadow-lg shadow-blue-100/30">
    <Meteors number={15} />
    <div className="relative z-10 w-14 h-14 rounded-full bg-white flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-lg shadow-blue-200/50">
      <Sparkles size={26} className="text-blue-500 group-hover:text-purple-600 transition-colors duration-300" />
    </div>
    <h3 className="relative z-10 text-lg font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent mb-2 group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">Coming Soon</h3>
    <p className="relative z-10 text-gray-600 text-sm text-center font-medium group-hover:text-gray-700 transition-colors duration-300">
      More practice questions<br />added weekly.
    </p>
  </div>
);

// Main Page Component
export const PracticeLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<QuestionWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Fetch questions on mount
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setIsLoading(true);
        const response = await fetchQuestions();
        const questionsWithMeta = response.questions.map(getQuestionMeta);
        setQuestions(questionsWithMeta);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load questions');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadQuestions();
  }, []);
  
  // Filter questions based on search and difficulty
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        q.instruction.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.displayTags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Difficulty filter
      const matchesDifficulty = !selectedDifficulty || q.displayDifficulty === selectedDifficulty;
      
      return matchesSearch && matchesDifficulty;
    });
  }, [questions, searchQuery, selectedDifficulty]);
  
  const handleQuestionClick = (questionId: string) => {
    navigate(`/questions/${questionId}`);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      {/* Header Section with Search */}
      <div className="mb-10">
        <div className="flex items-end justify-between gap-8 mb-6">
          <div className="flex-shrink-0">
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-2 tracking-tight">
              Practice Library
            </h1>
            <p className="text-gray-600 text-base font-medium">Select a topic to start your speaking practice.</p>
          </div>
          
          {/* Search & Filter Bar */}
          <div className="flex items-center gap-3 max-w-md w-full">
            {/* Search Input */}
            <div className="flex-1 relative group">
              <Search size={18} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-500 z-10 pointer-events-none" />
              <input
                type="text"
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-4 bg-white/80 backdrop-blur-sm border border-gray-200/80 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white hover:border-gray-300 hover:bg-white shadow-sm transition-all duration-200 relative"
              />
            </div>
            
            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`h-11 w-11 rounded-xl border flex items-center justify-center transition-all duration-200 flex-shrink-0 hover:scale-105 active:scale-95 shadow-sm ${
                showFilters || selectedDifficulty 
                  ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200/80 text-blue-600 shadow-md' 
                  : 'bg-white/80 backdrop-blur-sm border-gray-200/80 text-gray-500 hover:border-gray-300 hover:bg-white'
              }`}
            >
              <SlidersHorizontal size={18} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white/80 backdrop-blur-md rounded-xl border border-gray-200/60 p-4 mb-6 shadow-lg shadow-blue-100/20 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">Difficulty:</span>
            {(['EASY', 'MEDIUM', 'HARD'] as const).map((level) => {
              const style = difficultyStyles[level];
              const isSelected = selectedDifficulty === level;
              return (
                <button
                  key={level}
                  onClick={() => setSelectedDifficulty(isSelected ? null : level)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
                    isSelected
                      ? `${style.bg} ${style.text} ring-2 ring-offset-1 shadow-sm ${level === 'EASY' ? 'ring-emerald-300' : level === 'MEDIUM' ? 'ring-amber-300' : 'ring-rose-300'}`
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {level}
                </button>
              );
            })}
            {selectedDifficulty && (
              <button
                onClick={() => setSelectedDifficulty(null)}
                className="text-sm text-gray-400 hover:text-gray-600 ml-2 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-6 w-16 bg-gray-100 rounded-full" />
                <div className="h-4 w-20 bg-gray-100 rounded" />
              </div>
              <div className="h-6 w-32 bg-gray-100 rounded mb-2" />
              <div className="h-4 w-full bg-gray-100 rounded mb-2" />
              <div className="h-4 w-3/4 bg-gray-100 rounded mb-6" />
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-gray-100 rounded-full" />
                  <div className="h-6 w-20 bg-gray-100 rounded-full" />
                </div>
                <div className="h-10 w-10 bg-gray-100 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
      
      {/* Questions Grid */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuestions.map((question) => (
            <QuestionCard
              key={question.question_id}
              question={question}
              onClick={() => handleQuestionClick(question.question_id)}
            />
          ))}
          
          {/* Coming Soon Card - always show at the end */}
          <ComingSoonCard />
        </div>
      )}
      
      {/* Empty State */}
      {!isLoading && !error && filteredQuestions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No questions match your search.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedDifficulty(null);
            }}
            className="text-blue-600 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
};

export default PracticeLibraryPage;

