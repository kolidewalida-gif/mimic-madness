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

  // Get available devices — audio only (camera no longer used)
  const loadDevices = async () => {
    try {
      setIsLoading(true);

      // Request audio permission only (camera section was removed)
      await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

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
          // Still listed for legacy code (e.g. video recorder), but not requested upfront
          videoDevices.push({
            deviceId: device.deviceId,
            label: device.label || `Caméra ${videoDevices.length + 1}`,
            kind: device.kind,
          });
        }
      });

      setAudioInputs(audioDevices);
      setVideoInputs(videoDevices);

      // Set default audio device
      if (audioDevices.length > 0 && !selectedAudioId) {
        setSelectedAudioId(audioDevices[0].deviceId);
      }
      if (videoDevices.length > 0 && !selectedVideoId) {
        setSelectedVideoId(videoDevices[0].deviceId);
      }

      setError(null);
    } catch (err) {
      console.error('Error loading media devices:', err);
      setError("Impossible d'accéder au microphone. Vérifie les permissions.");
    } finally {
      setIsLoading(false);
    }
  };

  // Get media stream with selected devices.
  // IMPORTANT: defaults to AUDIO ONLY (camera section removed). Pass video: true
  // explicitly when a feature really needs the camera (e.g. video recorder).
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

      // Default to NO video unless explicitly requested
      const videoConstraints = constraints?.video !== undefined
        ? constraints.video
        : false;

      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: videoConstraints,
      });

      setStream(newStream);
      return newStream;
    } catch (err) {
      console.error('Error getting media stream:', err);
      setError("Impossible d'accéder au microphone.");
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
      // Preserve current video state (if any), but never re-request the camera
      // implicitly when only audio was active.
      const hasVideoTrack = stream.getVideoTracks().length > 0;
      await getMediaStream({
        audio: { deviceId: { exact: deviceId } },
        video: hasVideoTrack
          ? selectedVideoId
            ? { deviceId: { exact: selectedVideoId } }
            : true
          : false,
      });
    }
  };

  // Change video input — kept for legacy video recorder usage
  const changeVideoInput = async (deviceId: string) => {
    setSelectedVideoId(deviceId);
    if (stream && stream.getVideoTracks().length > 0) {
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
