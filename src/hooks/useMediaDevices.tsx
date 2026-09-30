import { useState, useEffect, useCallback, useRef } from 'react';

export interface MediaDeviceInfo {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export const useMediaDevices = ({ requestPermissionOnMount = true }: { requestPermissionOnMount?: boolean } = {}) => {
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Get available devices — audio only (camera no longer used)
  const loadDevices = useCallback(async (requestPermission = true) => {
    try {
      setIsLoading(true);

      // Request audio permission only (camera section was removed). The
      // temporary stream exists solely to reveal device labels: stop it as
      // soon as enumeration completes so opening Settings never leaves the
      // browser microphone indicator active.
      const permissionStream = requestPermission
        ? await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        : null;
      let devices: globalThis.MediaDeviceInfo[];
      try {
        devices = await navigator.mediaDevices.enumerateDevices();
      } finally {
        permissionStream?.getTracks().forEach((track) => track.stop());
      }

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
      setSelectedAudioId(current => audioDevices.some(device => device.deviceId === current) ? current : audioDevices[0]?.deviceId || '');
      setSelectedVideoId(current => videoDevices.some(device => device.deviceId === current) ? current : videoDevices[0]?.deviceId || '');

      setError(null);
    } catch (err) {
      console.error('Error loading media devices:', err);
      setError("Impossible d'accéder au microphone. Vérifie les permissions.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get media stream with selected devices.
  // IMPORTANT: defaults to AUDIO ONLY (camera section removed). Pass video: true
  // explicitly when a feature really needs the camera (e.g. video recorder).
  const getMediaStream = async (constraints?: {
    audio?: boolean | MediaTrackConstraints;
    video?: boolean | MediaTrackConstraints;
  }): Promise<MediaStream | null> => {
    try {
      // Stop existing stream
      streamRef.current?.getTracks().forEach(track => track.stop());

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

      streamRef.current = newStream;
      setStream(newStream);
      return newStream;
    } catch (err) {
      console.error('Error getting media stream:', err);
      setError("Impossible d'accéder au microphone.");
      return null;
    }
  };

  // Stop current stream
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
    }
  }, []);

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
    loadDevices(requestPermissionOnMount);

    // Listen for device changes
    const handleDeviceChange = () => {
      loadDevices(false);
    };

    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
      stopStream();
    };
  }, [loadDevices, requestPermissionOnMount, stopStream]);

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
