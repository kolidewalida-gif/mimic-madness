import { useState, useEffect } from 'react';

export interface MediaDeviceInfo {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export const useMediaDevices = () => {
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Get available devices
  const loadDevices = async () => {
    try {
      setIsLoading(true);
      
      // Request permissions first
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      
      // Enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const audioDevices: MediaDeviceInfo[] = [];
      const videoDevices: MediaDeviceInfo[] = [];
      
      devices.forEach(device => {
        if (device.kind === 'audioinput') {
          audioDevices.push({
            deviceId: device.deviceId,
            label: device.label || `Microphone ${audioDevices.length + 1}`,
            kind: device.kind,
          });
        } else if (device.kind === 'videoinput') {
          videoDevices.push({
            deviceId: device.deviceId,
            label: device.label || `Caméra ${videoDevices.length + 1}`,
            kind: device.kind,
          });
        }
      });
      
      setAudioInputs(audioDevices);
      setVideoInputs(videoDevices);
      
      // Set default devices
      if (audioDevices.length > 0 && !selectedAudioId) {
        setSelectedAudioId(audioDevices[0].deviceId);
      }
      if (videoDevices.length > 0 && !selectedVideoId) {
        setSelectedVideoId(videoDevices[0].deviceId);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error loading media devices:', err);
      setError('Impossible d\'accéder aux périphériques média. Vérifiez les permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get media stream with selected devices
  const getMediaStream = async (constraints?: {
    audio?: boolean | MediaTrackConstraints;
    video?: boolean | MediaTrackConstraints;
  }): Promise<MediaStream | null> => {
    try {
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const audioConstraints = constraints?.audio !== undefined 
        ? constraints.audio 
        : selectedAudioId 
          ? { deviceId: { exact: selectedAudioId } }
          : true;

      const videoConstraints = constraints?.video !== undefined
        ? constraints.video
        : selectedVideoId
          ? { 
              deviceId: { exact: selectedVideoId },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          : true;

      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: videoConstraints,
      });

      setStream(newStream);
      return newStream;
    } catch (err) {
      console.error('Error getting media stream:', err);
      setError('Impossible d\'accéder à la caméra ou au microphone.');
      return null;
    }
  };

  // Stop current stream
  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Change audio input
  const changeAudioInput = async (deviceId: string) => {
    setSelectedAudioId(deviceId);
    if (stream) {
      await getMediaStream({
        audio: { deviceId: { exact: deviceId } },
        video: selectedVideoId ? { deviceId: { exact: selectedVideoId } } : true,
      });
    }
  };

  // Change video input
  const changeVideoInput = async (deviceId: string) => {
    setSelectedVideoId(deviceId);
    if (stream) {
      await getMediaStream({
        audio: selectedAudioId ? { deviceId: { exact: selectedAudioId } } : true,
        video: { deviceId: { exact: deviceId } },
      });
    }
  };

  // Load devices on mount
  useEffect(() => {
    loadDevices();

    // Listen for device changes
    const handleDeviceChange = () => {
      loadDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      stopStream();
    };
  }, []);

  return {
    audioInputs,
    videoInputs,
    selectedAudioId,
    selectedVideoId,
    isLoading,
    error,
    stream,
    getMediaStream,
    stopStream,
    changeAudioInput,
    changeVideoInput,
    reloadDevices: loadDevices,
  };
};
