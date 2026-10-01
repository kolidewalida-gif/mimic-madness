import { useState, useRef, useCallback, useEffect } from 'react';
import { createMicrophoneAudioContext, microphoneConstraints, isBrowserMicrophoneFilterEnabled, setBrowserMicrophoneFilterEnabled } from '@/lib/microphoneCapture';
import { processStreamWithNoiseReduction } from './useNoiseReduction';

interface UseMicrophoneTestProps {
  selectedAudioId: string;
}

export const useMicrophoneTest = ({ selectedAudioId }: UseMicrophoneTestProps) => {
  const [isTesting, setIsTesting] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noiseSuppressionEnabled, setNoiseSuppressionEnabled] = useState(isBrowserMicrophoneFilterEnabled);
  const noiseCleanupRef = useRef<(() => void) | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sessionRef = useRef(0);
  const playbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up function
  const cleanup = useCallback(() => {
    sessionRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    noiseCleanupRef.current?.();
    noiseCleanupRef.current = null;
    if (playbackTimerRef.current !== null) {
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.srcObject = null;
      audioElementRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    gainNodeRef.current = null;
    destinationRef.current = null;
    setAudioLevel(0);
  }, []);

  // Start microphone test with audio loopback
  const startTest = useCallback(async (noiseOverride?: boolean) => {
    cleanup();
    const session = sessionRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsStarting(true);
    setIsTesting(false);
    setError(null);
    try {
      
      // Get microphone stream with noise suppression settings
      const constraints: MediaStreamConstraints = {
        audio: microphoneConstraints({ deviceId: selectedAudioId, noiseSuppression: noiseOverride ?? noiseSuppressionEnabled }),
        video: false,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (session !== sessionRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;
      const processed = await processStreamWithNoiseReduction(stream, { signal: controller.signal });
      if (session !== sessionRef.current) { processed.cleanup(); return; }
      noiseCleanupRef.current = processed.cleanup;
      
      // Create audio context for analysis and playback
      const audioContext = createMicrophoneAudioContext();
      audioContextRef.current = audioContext;
      
      // Create source from microphone
      const source = audioContext.createMediaStreamSource(processed.stream);
      
      // Create analyser for volume visualization
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      
      // Create gain node for volume control
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1.0;
      gainNodeRef.current = gainNode;
      
      // Create destination for audio output
      const destination = audioContext.createMediaStreamDestination();
      destinationRef.current = destination;
      
      // Connect: source -> analyser -> gain -> destination
      source.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(destination);
      
      // Loopback requires headphones: a delayed start cannot prevent feedback.
      const audioElement = new Audio();
      audioElement.srcObject = destination.stream;
      audioElement.volume = 0.8;
      
      // Add small delay to prevent echo
      playbackTimerRef.current = setTimeout(() => {
        if (session === sessionRef.current) audioElement.play().catch(console.error);
      }, 100);
      
      audioElementRef.current = audioElement;
      
      // Reuse the buffer and limit React meter updates to 20Hz.
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let lastMeter = -Infinity;
      const updateLevel = () => {
        if (!analyserRef.current) return;
        const now = performance.now();
        if (now - lastMeter >= 50) {
          lastMeter = now;
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(Math.min(100, (average / 128) * 100));
        }
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
      setIsTesting(true);
      
    } catch (error) {
      if (session !== sessionRef.current) return;
      console.error('Error starting microphone test:', error);
      setError(typeof error === 'object' && error !== null && 'name' in error && error.name === 'NotAllowedError'
        ? 'Accès au micro refusé. Autorise-le dans ton navigateur, puis réessaie.'
        : 'Le test n’a pas pu démarrer. Vérifie ton micro, puis réessaie.');
      setIsStarting(false);
      cleanup();
    } finally {
      if (session === sessionRef.current) setIsStarting(false);
    }
  }, [selectedAudioId, noiseSuppressionEnabled, cleanup]);

  // Stop microphone test
  const stopTest = useCallback(() => {
    cleanup();
    setIsTesting(false);
    setIsStarting(false);
  }, [cleanup]);

  // Toggle noise suppression - restart test if currently testing
  const toggleNoiseSuppression = useCallback(async () => {
    const newValue = !noiseSuppressionEnabled;
    setBrowserMicrophoneFilterEnabled(newValue);
    setNoiseSuppressionEnabled(newValue);
    
    // If currently testing, restart with new settings
    if (isTesting && streamRef.current) {
      // Apply new constraints to existing audio track
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        try {
          const { deviceId: _device, ...processing } = microphoneConstraints({ deviceId: '', noiseSuppression: newValue });
          await audioTrack.applyConstraints(processing);
        } catch (error) {
          console.error('Error applying constraints, restarting test:', error);
          // If constraints can't be applied, restart the test
          stopTest();
          void startTest(newValue);
        }
      }
    }
  }, [noiseSuppressionEnabled, isTesting, stopTest, startTest]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isTesting,
    isStarting,
    error,
    audioLevel,
    noiseSuppressionEnabled,
    startTest,
    stopTest,
    toggleNoiseSuppression,
  };
};
