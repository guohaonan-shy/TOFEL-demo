import { useState, useRef, useCallback } from 'react';

export interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  audioBlob: Blob | null;
  error: string | null;
  audioLevel: number; // 0-100 for waveform visualization
}

export interface AudioRecorderControls {
  warmup: () => Promise<void>;  // Pre-initialize microphone for faster start
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  clearRecording: () => void;
  isWarmedUp: boolean;
}

/**
 * Hook for recording audio from the user's microphone
 * Provides real-time audio level for waveform visualization
 */
export function useAudioRecorder(): AudioRecorderState & AudioRecorderControls & { isWarmedUp: boolean } {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isWarmedUp, setIsWarmedUp] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const warmedUpStreamRef = useRef<MediaStream | null>(null);

  /**
   * Update audio level for visualization
   * Uses a ref to track pause state to avoid stale closure issues
   */
  const isPausedRef = useRef(false);
  
  // Keep ref in sync with state
  isPausedRef.current = isPaused;

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      return;
    }
    
    if (isPausedRef.current) {
      setAudioLevel(0);
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      return;
    }

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const normalizedLevel = Math.min(100, (average / 255) * 200); // Amplify for better visualization

    setAudioLevel(normalizedLevel);

    // Continue animation loop
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  /**
   * Pre-initialize microphone stream for faster recording start
   * Call this at the start of practice to request permission and keep stream ready
   * Throws error if permission is denied (so caller can handle it)
   */
  const warmup = useCallback(async () => {
    // Already warmed up
    if (warmedUpStreamRef.current) {
      return;
    }
    
    console.log('Warming up microphone...');
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      } 
    });
    warmedUpStreamRef.current = stream;
    setIsWarmedUp(true);
    console.log('Microphone warmed up and ready');
  }, []);

  /**
   * Start recording audio
   */
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      audioChunksRef.current = [];

      // Use pre-warmed stream if available, otherwise request new one
      let stream: MediaStream;
      if (warmedUpStreamRef.current) {
        console.log('Using pre-warmed microphone stream');
        stream = warmedUpStreamRef.current;
        warmedUpStreamRef.current = null; // Clear after use
        setIsWarmedUp(false);
      } else {
        console.log('Requesting new microphone stream...');
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } 
        });
      }
      streamRef.current = stream;

      // Set up Web Audio API for waveform visualization
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume AudioContext if suspended (required by browser autoplay policy)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3; // Faster response
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Determine supported mimeType
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/ogg';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Let browser decide
          }
        }
      }

      // Set up MediaRecorder
      const mediaRecorderOptions: MediaRecorderOptions = mimeType 
        ? { mimeType } 
        : {};
      const mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType || 'audio/webm' 
        });
        setAudioBlob(blob);
        setIsRecording(false);

        // Clean up animation
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        // Close audio context
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
        // Stop stream tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      // Request data every 100ms for smoother recording
      mediaRecorder.start(100);
      setIsRecording(true);

      // Start audio level monitoring
      updateAudioLevel();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access microphone';
      setError(errorMessage);
      console.error('Audio recording error:', err);
    }
  }, [updateAudioLevel]);

  /**
   * Stop recording
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsPaused(false);
    }
  }, [isRecording]);

  /**
   * Pause recording
   */
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      setAudioLevel(0);
    }
  }, [isRecording]);

  /**
   * Resume recording
   */
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      // Animation loop is already running, isPausedRef will be updated
    }
  }, [isPaused]);

  /**
   * Clear the recorded audio
   */
  const clearRecording = useCallback(() => {
    setAudioBlob(null);
    audioChunksRef.current = [];
  }, []);

  return {
    isRecording,
    isPaused,
    audioBlob,
    error,
    audioLevel,
    isWarmedUp,
    warmup,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
  };
}

