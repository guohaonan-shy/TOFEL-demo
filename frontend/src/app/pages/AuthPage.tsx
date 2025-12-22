/**
 * Authentication Page
 * 
 * Combined login and signup page with a split layout:
 * - Left: Brand section with testimonial
 * - Right: Login/Signup form
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Star, AlertCircle, Loader2, Mic, Sparkles, Zap, Volume2, MessageSquare, Target } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// Default question ID for redirect after login
const DEFAULT_QUESTION_ID = 'question_01KCH9WP8W6TZXA5QXS1BFF6AS';

type AuthMode = 'signin' | 'signup';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  
  // Form state
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await signUp(email, password);
        if (signUpError) {
          setError(getErrorMessage(signUpError.message));
          return;
        }
        // After signup, automatically sign in
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          setError(getErrorMessage(signInError.message));
          return;
        }
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          setError(getErrorMessage(signInError.message));
          return;
        }
      }
      
      // Redirect to questions page on success
      navigate(`/questions/${DEFAULT_QUESTION_ID}`);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Convert Supabase error messages to user-friendly messages
  const getErrorMessage = (message: string): string => {
    if (message.includes('Invalid login credentials')) {
      return 'Invalid email or password. Please check and try again.';
    }
    if (message.includes('User already registered')) {
      return 'This email is already registered. Please sign in instead.';
    }
    if (message.includes('Password should be at least')) {
      return 'Password must be at least 6 characters long.';
    }
    if (message.includes('Invalid email')) {
      return 'Please enter a valid email address.';
    }
    return message;
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError(null);
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Section - Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden flex-col p-8 text-white">
        {/* Decorative SVG overlay */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 0 L100 0 L100 100 Z" fill="white" />
          </svg>
        </div>
        
        {/* Logo */}
        <div className="z-10 mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <span className="text-white font-bold text-2xl">T</span>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="z-10 mb-6">
          <h1 className="text-4xl font-bold mb-4 leading-tight">Master Your Speaking.</h1>
          <p className="text-blue-200 text-lg max-w-2xl leading-relaxed">
            Join thousands of students achieving their target TOEFL scores with AI-powered feedback and real-time practice.
          </p>
        </div>
        
        {/* Feature Showcase - Interactive Demo */}
        <div className="z-10 mb-auto py-2">
          <div className="relative w-full max-w-3xl">
            {/* Central Microphone Circle */}
            <div className="relative flex items-center justify-center mb-6 h-36">
              {/* Animated outer ring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full border-2 border-dashed border-blue-400/30 animate-spin-slow" style={{ animationDuration: '20s' }}>
                  {/* Dots on the circle */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50" />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-400 rounded-full shadow-lg shadow-indigo-400/50" />
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-purple-400 rounded-full shadow-lg shadow-purple-400/50" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-pink-400 rounded-full shadow-lg shadow-pink-400/50" />
                </div>
              </div>
              
              {/* Inner circle with microphone */}
              <div className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-500/50">
                <Mic className="w-9 h-9 text-white" strokeWidth={2.5} />
                {/* Pulse effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 animate-ping opacity-20" />
              </div>
            </div>
            
            {/* Score Cards */}
            <div className="space-y-3 mb-6">
              {/* Delivery - 4.0 = 4 stars filled */}
              <div className="group bg-gradient-to-r from-blue-500/15 to-blue-500/5 backdrop-blur-sm rounded-2xl px-5 py-4 border border-blue-400/20 hover:border-blue-400/50 transition-all duration-300 hover:scale-[1.02]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <Volume2 className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-base font-semibold text-blue-100">Delivery</span>
                      {/* Star rating - 4 filled, 1 empty */}
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={16} 
                            className={i < 4 ? "fill-blue-400 text-blue-400" : "text-blue-400/30"} 
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-2xl font-bold text-blue-300 tabular-nums">4.0</span>
                    <span className="text-sm text-blue-400/50">/5.0</span>
                  </div>
                </div>
              </div>
              
              {/* Language - 4.5 = 4 full + 1 half star */}
              <div className="group bg-gradient-to-r from-indigo-500/15 to-indigo-500/5 backdrop-blur-sm rounded-2xl px-5 py-4 border border-indigo-400/20 hover:border-indigo-400/50 transition-all duration-300 hover:scale-[1.02]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-base font-semibold text-indigo-100">Language</span>
                      {/* Star rating - 4 full + 1 half */}
                      <div className="flex gap-1">
                        {[...Array(4)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={16} 
                            className="fill-indigo-400 text-indigo-400"
                          />
                        ))}
                        {/* Half star */}
                        <div className="relative">
                          <Star size={16} className="text-indigo-400/30" />
                          <div className="absolute inset-0 overflow-hidden w-1/2">
                            <Star size={16} className="fill-indigo-400 text-indigo-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-2xl font-bold text-indigo-300 tabular-nums">4.5</span>
                    <span className="text-sm text-indigo-400/50">/5.0</span>
                  </div>
                </div>
              </div>
              
              {/* Topic - 4.5 = 4 full + 1 half star */}
              <div className="group bg-gradient-to-r from-purple-500/15 to-purple-500/5 backdrop-blur-sm rounded-2xl px-5 py-4 border border-purple-400/20 hover:border-purple-400/50 transition-all duration-300 hover:scale-[1.02]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <Target className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-base font-semibold text-purple-100">Topic</span>
                      {/* Star rating - 4 full + 1 half */}
                      <div className="flex gap-1">
                        {[...Array(4)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={16} 
                            className="fill-purple-400 text-purple-400"
                          />
                        ))}
                        {/* Half star */}
                        <div className="relative">
                          <Star size={16} className="text-purple-400/30" />
                          <div className="absolute inset-0 overflow-hidden w-1/2">
                            <Star size={16} className="fill-purple-400 text-purple-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-2xl font-bold text-purple-300 tabular-nums">4.5</span>
                    <span className="text-sm text-purple-400/50">/5.0</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Feature Pills */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-medium text-gray-300">AI Analysis</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                <Zap className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-medium text-gray-300">Real-time</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Testimonial Card */}
        <div className="z-10 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 max-w-3xl">
          {/* Stars */}
          <div className="flex gap-1 mb-3">
            {[1,2,3,4,5].map(i => <Star key={i} size={16} fill="#FACC15" className="text-yellow-400" />)}
          </div>
          
          {/* Quote */}
          <p className="italic text-gray-300 mb-4">
            "This app helped me jump from 23 to 28 in just two weeks. The AI feedback is scary accurate."
          </p>
          
          {/* Author */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-xs">JD</div>
            <div className="text-sm font-medium">John Doe <span className="text-gray-400 mx-1">•</span> Stanford '25</div>
          </div>
        </div>
      </div>

      {/* Right Section - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50/50">
        <div className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {mode === 'signin' ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-gray-500">
              {mode === 'signin' 
                ? 'Enter your details to access your dashboard.' 
                : 'Start your journey to a better score today.'}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Inputs */}
            <div className="space-y-4">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={18} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-500/30 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                mode === 'signin' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Toggle Mode Link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={toggleMode}
                className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
              >
                {mode === 'signin' ? 'Sign up for free' : 'Log in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
