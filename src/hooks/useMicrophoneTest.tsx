import { useState, useRef, useCallback, useEffect } from 'react';

interface UseMicrophoneTestProps {
  selectedAudioId: string;
}

export const useMicrophoneTest = ({ selectedAudioId }: UseMicrophoneTestProps) => {
  const [isTesting, setIsTesting] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [noiseSuppressionEnabled, setNoiseSuppressionEnabled] = useState(true);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Clean up function
  const cleanup = useCallback(() => {
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
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    gainNodeRef.current = null;
    destinationRef.current = null;
    setAudioLevel(0);
  }, []);

  // Start microphone test with audio loopback
  const startTest = useCallback(async () => {
    try {
      cleanup();
      
      // Get microphone stream with noise suppression settings
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: selectedAudioId ? { exact: selectedAudioId } : undefined,
          echoCancellation: true,
          noiseSuppression: noiseSuppressionEnabled,
          autoGainControl: true,
        },
        video: false,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      // Create audio context for analysis and playback
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      // Create source from microphone
      const source = audioContext.createMediaStreamSource(stream);
      
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
      
      // Create audio element for playback with slight delay to prevent feedback
      const audioElement = new Audio();
      audioElement.srcObject = destination.stream;
      audioElement.volume = 0.8;
      
      // Add small delay to prevent echo
      setTimeout(() => {
        audioElement.play().catch(console.error);
      }, 100);
      
      audioElementRef.current = audioElement;
      
      // Start volume level animation
      const updateLevel = () => {
        if (!analyserRef.current) return;
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / dataArray.length;
        const normalizedLevel = Math.min(100, (average / 128) * 100);
        
        setAudioLevel(normalizedLevel);
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
      setIsTesting(true);
      
    } catch (error) {
      console.error('Error starting microphone test:', error);
      cleanup();
    }
  }, [selectedAudioId, noiseSuppressionEnabled, cleanup]);

  // Stop microphone test
  const stopTest = useCallback(() => {
    cleanup();
    setIsTesting(false);
  }, [cleanup]);

  // Toggle noise suppression - restart test if currently testing
  const toggleNoiseSuppression = useCallback(async () => {
    const newValue = !noiseSuppressionEnabled;
    setNoiseSuppressionEnabled(newValue);
    
    // If currently testing, restart with new settings
    if (isTesting && streamRef.current) {
      // Apply new constraints to existing audio track
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        try {
          await audioTrack.applyConstraints({
            noiseSuppression: newValue,
            echoCancellation: true,
            autoGainControl: true,
          });
        } catch (error) {
          console.error('Error applying constraints, restarting test:', error);
          // If constraints can't be applied, restart the test
          stopTest();
          setTimeout(() => {
            startTest();
          }, 100);
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
    audioLevel,
    noiseSuppressionEnabled,
    startTest,
    stopTest,
    toggleNoiseSuppression,
  };
};
