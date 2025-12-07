import { GameCard } from "@/components/GameCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, Video, Settings, RefreshCw, User } from "lucide-react";
import { useMediaDevices, MediaDeviceInfo } from "@/hooks/useMediaDevices";
import { useEffect, useRef, useState } from "react";
import { AvatarSettings } from "@/components/AvatarSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DeviceSettingsProps {
  onClose?: () => void;
  showPreview?: boolean;
  playerId?: string;
  playerName?: string;
  lobbyId?: string;
}

export const DeviceSettings = ({ onClose, showPreview = true, playerId, playerName, lobbyId }: DeviceSettingsProps) => {
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

  const showAvatarTab = playerId && playerName && lobbyId;

  return (
    <GameCard>
      <div className="space-y-6">
        {showAvatarTab ? (
          <Tabs defaultValue="devices" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="devices" className="gap-2">
                <Settings className="h-4 w-4" />
                Audio/Vidéo
              </TabsTrigger>
              <TabsTrigger value="avatar" className="gap-2">
                <User className="h-4 w-4" />
                Avatar
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="devices" className="mt-4 space-y-6">
              <DeviceSettingsContent
                audioInputs={audioInputs}
                videoInputs={videoInputs}
                selectedAudioId={selectedAudioId}
                selectedVideoId={selectedVideoId}
                isLoading={isLoading}
                error={error}
                showPreview={showPreview}
                isPreviewActive={isPreviewActive}
                videoRef={videoRef}
                onReloadDevices={reloadDevices}
                onGetMediaStream={getMediaStream}
                onStopStream={stopStream}
                onChangeAudioInput={changeAudioInput}
                onChangeVideoInput={changeVideoInput}
                onStartPreview={startPreview}
                onStopPreview={handleStopPreview}
              />
            </TabsContent>
            
            <TabsContent value="avatar" className="mt-4">
              <AvatarSettings playerId={playerId} playerName={playerName} lobbyId={lobbyId} />
            </TabsContent>
          </Tabs>
        ) : (
          <>
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
            
            <DeviceSettingsContent
              audioInputs={audioInputs}
              videoInputs={videoInputs}
              selectedAudioId={selectedAudioId}
              selectedVideoId={selectedVideoId}
              isLoading={isLoading}
              error={error}
              showPreview={showPreview}
              isPreviewActive={isPreviewActive}
              videoRef={videoRef}
              onReloadDevices={reloadDevices}
              onGetMediaStream={getMediaStream}
              onStopStream={stopStream}
              onChangeAudioInput={changeAudioInput}
              onChangeVideoInput={changeVideoInput}
              onStartPreview={startPreview}
              onStopPreview={handleStopPreview}
            />
          </>
        )}

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

interface DeviceSettingsContentProps {
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  selectedAudioId: string;
  selectedVideoId: string;
  isLoading: boolean;
  error: string | null;
  showPreview: boolean;
  isPreviewActive: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  onReloadDevices: () => void;
  onGetMediaStream: (constraints?: MediaStreamConstraints) => Promise<MediaStream | null>;
  onStopStream: () => void;
  onChangeAudioInput: (deviceId: string) => void;
  onChangeVideoInput: (deviceId: string) => void;
  onStartPreview: () => void;
  onStopPreview: () => void;
}

const DeviceSettingsContent = ({
  audioInputs,
  videoInputs,
  selectedAudioId,
  selectedVideoId,
  isLoading,
  error,
  showPreview,
  isPreviewActive,
  videoRef,
  onReloadDevices,
  onGetMediaStream,
  onStopStream,
  onChangeAudioInput,
  onChangeVideoInput,
  onStartPreview,
  onStopPreview,
}: DeviceSettingsContentProps) => {
  return (
    <>
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Audio Input Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Mic className="h-4 w-4 text-secondary" />
            Microphone
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await onGetMediaStream({ audio: true, video: false });
              onStopStream();
            }}
            disabled={isLoading}
          >
            Autoriser
          </Button>
        </div>
        <Select
          value={selectedAudioId}
          onValueChange={onChangeAudioInput}
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
          onValueChange={onChangeVideoInput}
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
                onClick={onStartPreview}
                disabled={isLoading || !selectedAudioId || !selectedVideoId}
                className="flex-1"
                variant="primary"
              >
                <Video className="h-4 w-4" />
                Tester la Caméra
              </Button>
            ) : (
              <Button
                onClick={onStopPreview}
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
    </>
  );
};
