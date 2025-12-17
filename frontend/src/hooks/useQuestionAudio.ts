/**
 * Hook for managing question audio playback and beep sounds.
 * Uses Web Audio API with pre-decoded AudioBuffer for smooth, stutter-free playback.
 * The decoded audio is cached and can be reused across restarts/discards.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// Generate a beep sound using Web Audio API
function createBeepSound(
  audioContext: AudioContext,
  frequency: number = 800,
  duration: number = 0.8,
  volume: number = 0.5
): Promise<void> {
  return new Promise((resolve) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    // Fade in and out for smoother sound
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + duration - 0.1);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);

    oscillator.onended = () => resolve();
  });
}

interface UseQuestionAudioReturn {
  // State
  isLoading: boolean;
  isPlaying: boolean;
  error: string | null;
  
  // Actions
  loadAudio: (audioUrl: string) => Promise<void>;
  playQuestionAudio: () => Promise<void>;
  playBeep: () => Promise<void>;
  stopAudio: () => void;
  
  // Cleanup
  cleanup: () => void;
}

export function useQuestionAudio(): UseQuestionAudioReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AudioContext is shared for all audio operations
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Pre-decoded AudioBuffer - cached for the entire page lifecycle
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  
  // Current playing source node (AudioBufferSourceNode is one-time use)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  
  // Track which URL is currently cached
  const cachedUrlRef = useRef<string | null>(null);
  
  // Resolve function for current playback promise
  const playbackResolveRef = useRef<(() => void) | null>(null);

  // Initialize or get AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Cache for raw audio data (before decoding)
  const rawAudioDataRef = useRef<ArrayBuffer | null>(null);

  // Load audio from URL (fetch only, decode later on user interaction)
  const loadAudio = useCallback(async (audioUrl: string) => {
    if (!audioUrl) {
      setError('No audio URL provided');
      return;
    }

    // If already cached the same URL, skip loading
    if (cachedUrlRef.current === audioUrl && (audioBufferRef.current || rawAudioDataRef.current)) {
      console.log('[useQuestionAudio] Audio already cached, skipping load');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[useQuestionAudio] Fetching audio from:', audioUrl);
      
      // Fetch audio data
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`);
      }

      // Get ArrayBuffer - cache it for later decoding
      const arrayBuffer = await response.arrayBuffer();
      rawAudioDataRef.current = arrayBuffer;
      cachedUrlRef.current = audioUrl;
      
      console.log('[useQuestionAudio] Audio fetched and cached, size:', arrayBuffer.byteLength, 'bytes. Will decode on first play.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load audio';
      setError(message);
      console.error('[useQuestionAudio] Error loading audio:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Decode audio if not already decoded (called on first play after user interaction)
  const ensureDecoded = useCallback(async (): Promise<AudioBuffer> => {
    // Already decoded
    if (audioBufferRef.current) {
      return audioBufferRef.current;
    }
    
    // Need to decode from raw data
    if (!rawAudioDataRef.current) {
      throw new Error('Audio not loaded');
    }
    
    console.log('[useQuestionAudio] Decoding audio on first play...');
    
    const ctx = getAudioContext();
    
    // Resume if suspended (browser autoplay policy) - this is OK now because user has interacted
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    // Decode audio data into AudioBuffer
    // Note: decodeAudioData consumes the ArrayBuffer, so we need to clone it
    const arrayBufferCopy = rawAudioDataRef.current.slice(0);
    const audioBuffer = await ctx.decodeAudioData(arrayBufferCopy);
    
    // Cache the decoded buffer
    audioBufferRef.current = audioBuffer;
    
    console.log('[useQuestionAudio] Audio decoded and cached. Duration:', audioBuffer.duration.toFixed(2), 's');
    
    return audioBuffer;
  }, [getAudioContext]);

  // Play the cached question audio using AudioBufferSourceNode
  const playQuestionAudio = useCallback((): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        // Ensure audio is decoded (will decode on first play)
        const buffer = await ensureDecoded();
        
        const ctx = getAudioContext();
        
        // Resume if suspended (browser autoplay policy)
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        // Stop any currently playing audio
        if (sourceNodeRef.current) {
          try {
            sourceNodeRef.current.stop();
          } catch (e) {
            // Ignore - source might already be stopped
          }
          sourceNodeRef.current.disconnect();
          sourceNodeRef.current = null;
        }

        // Create a new source node (AudioBufferSourceNode is single-use)
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        
        sourceNodeRef.current = source;
        playbackResolveRef.current = resolve;

        // Handle playback end
        source.onended = () => {
          setIsPlaying(false);
          sourceNodeRef.current = null;
          if (playbackResolveRef.current) {
            playbackResolveRef.current();
            playbackResolveRef.current = null;
          }
        };

        // Start playback immediately
        source.start(0);
        setIsPlaying(true);
        
        console.log('[useQuestionAudio] Playing audio from decoded buffer');
      } catch (err) {
        setIsPlaying(false);
        console.error('[useQuestionAudio] Error playing audio:', err);
        reject(err);
      }
    });
  }, [getAudioContext, ensureDecoded]);

  // Play a beep sound
  const playBeep = useCallback(async (): Promise<void> => {
    try {
      const ctx = getAudioContext();
      // Resume if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      await createBeepSound(ctx, 800, 0.8, 0.5);
    } catch (err) {
      console.error('[useQuestionAudio] Error playing beep:', err);
    }
  }, [getAudioContext]);

  // Stop current audio playback
  const stopAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {
        // Ignore - source might already be stopped
      }
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
    
    // Resolve any pending playback promise
    if (playbackResolveRef.current) {
      playbackResolveRef.current();
      playbackResolveRef.current = null;
    }
  }, []);

  // Cleanup resources (only called on unmount)
  const cleanup = useCallback(() => {
    stopAudio();
    
    // Clear cached data
    audioBufferRef.current = null;
    rawAudioDataRef.current = null;
    cachedUrlRef.current = null;

    // Close AudioContext
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, [stopAudio]);

  // Cleanup on unmount only - DO NOT clear cache on re-renders
  useEffect(() => {
    return () => {
      // Stop any playing audio
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
        } catch (e) {
          // Ignore
        }
        sourceNodeRef.current = null;
      }

      // Close AudioContext on unmount
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      // Note: We don't clear audioBufferRef here because the component might remount
      // The buffer will be garbage collected when the page unloads
    };
  }, []);

  return {
    isLoading,
    isPlaying,
    error,
    loadAudio,
    playQuestionAudio,
    playBeep,
    stopAudio,
    cleanup,
  };
}
