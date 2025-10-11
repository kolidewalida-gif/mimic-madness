import { GameCard } from "@/components/GameCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, Video, Settings, RefreshCw } from "lucide-react";
import { useMediaDevices } from "@/hooks/useMediaDevices";
import { useEffect, useRef, useState } from "react";

interface DeviceSettingsProps {
  onClose?: () => void;
  showPreview?: boolean;
}

export const DeviceSettings = ({ onClose, showPreview = true }: DeviceSettingsProps) => {
  const {
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
    reloadDevices,
  } = useMediaDevices();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPreviewActive, setIsPreviewActive] = useState(false);

  // Start preview
  const startPreview = async () => {
    const mediaStream = await getMediaStream();
    if (mediaStream && videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      setIsPreviewActive(true);
    }
  };

  // Stop preview
  const handleStopPreview = () => {
    stopStream();
    setIsPreviewActive(false);
  };

  // Update video preview when stream changes
  useEffect(() => {
    if (stream && videoRef.current && isPreviewActive) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isPreviewActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  return (
    <GameCard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-secondary" />
            <h3 className="text-xl font-semibold text-gradient">
              Paramètres Audio/Vidéo
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={reloadDevices}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Audio Input Selection */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Mic className="h-4 w-4 text-secondary" />
            Microphone
          </label>
          <Select
            value={selectedAudioId}
            onValueChange={changeAudioInput}
            disabled={isLoading || audioInputs.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez un microphone" />
            </SelectTrigger>
            <SelectContent>
              {audioInputs.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Video Input Selection */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Video className="h-4 w-4 text-secondary" />
            Caméra
          </label>
          <Select
            value={selectedVideoId}
            onValueChange={changeVideoInput}
            disabled={isLoading || videoInputs.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez une caméra" />
            </SelectTrigger>
            <SelectContent>
              {videoInputs.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Video Preview */}
        {showPreview && (
          <div className="space-y-3">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              {isPreviewActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-foreground-secondary">
                  <div className="text-center space-y-2">
                    <Video className="h-12 w-12 mx-auto opacity-50" />
                    <p>Aperçu de la caméra</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {!isPreviewActive ? (
                <Button
                  onClick={startPreview}
                  disabled={isLoading || !selectedAudioId || !selectedVideoId}
                  className="flex-1"
                  variant="primary"
                >
                  <Video className="h-4 w-4" />
                  Tester la Caméra
                </Button>
              ) : (
                <Button
                  onClick={handleStopPreview}
                  className="flex-1"
                  variant="outline"
                >
                  Arrêter l'Aperçu
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Device Info */}
        <div className="pt-4 border-t border-glass-border text-sm text-foreground-secondary space-y-1">
          <p>• {audioInputs.length} microphone(s) détecté(s)</p>
          <p>• {videoInputs.length} caméra(s) détectée(s)</p>
        </div>

        {onClose && (
          <Button
            onClick={onClose}
            variant="hero"
            className="w-full"
          >
            Fermer
          </Button>
        )}
      </div>
    </GameCard>
  );
};
