import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Mic, Video, Settings, RefreshCw, User, Volume2, VolumeX, Music, X, Sparkles } from "lucide-react";
import { useMediaDevices, MediaDeviceInfo } from "@/hooks/useMediaDevices";
import { useMicrophoneTest } from "@/hooks/useMicrophoneTest";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { useSoundEffectsVolume } from "@/hooks/useSoundEffectsVolume";
import { useEffect, useRef, useState } from "react";
import { AvatarSettings } from "@/components/AvatarSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
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

  const {
    isTesting: isMicTesting,
    audioLevel,
    noiseSuppressionEnabled,
    startTest: startMicTest,
    stopTest: stopMicTest,
    toggleNoiseSuppression,
  } = useMicrophoneTest({ selectedAudioId });

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

  const showAvatarTab = playerId && playerName;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl">
      {/* Decorative top accent */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
      <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold leading-tight">Paramètres</h3>
            <p className="text-xs text-muted-foreground">Audio · Vidéo · Avatar</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={reloadDevices} disabled={isLoading} title="Recharger les appareils">
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} title="Fermer">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="max-h-[75vh] overflow-y-auto px-6 py-5 space-y-5">
        {showAvatarTab ? (
          <Tabs defaultValue="devices" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-background/60 p-1">
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
                isMicTesting={isMicTesting}
                audioLevel={audioLevel}
                noiseSuppressionEnabled={noiseSuppressionEnabled}
                onStartMicTest={startMicTest}
                onStopMicTest={stopMicTest}
                onToggleNoiseSuppression={toggleNoiseSuppression}
              />
            </TabsContent>
            
            <TabsContent value="avatar" className="mt-4">
              <AvatarSettings playerId={playerId} playerName={playerName} />
            </TabsContent>
          </Tabs>
        ) : (
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
              isMicTesting={isMicTesting}
              audioLevel={audioLevel}
              noiseSuppressionEnabled={noiseSuppressionEnabled}
              onStartMicTest={startMicTest}
              onStopMicTest={stopMicTest}
              onToggleNoiseSuppression={toggleNoiseSuppression}
          />
        )}
      </div>

      {onClose && (
        <div className="border-t border-border/60 px-6 py-3">
          <Button onClick={onClose} variant="hero" className="w-full">
            Fermer
          </Button>
        </div>
      )}
    </div>
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
  isMicTesting: boolean;
  audioLevel: number;
  noiseSuppressionEnabled: boolean;
  onStartMicTest: () => void;
  onStopMicTest: () => void;
  onToggleNoiseSuppression: () => void;
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
  isMicTesting,
  audioLevel,
  noiseSuppressionEnabled,
  onStartMicTest,
  onStopMicTest,
  onToggleNoiseSuppression,
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

        {/* Noise Suppression Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-background-secondary/30 border border-glass-border">
          <div className="flex items-center gap-2">
            {noiseSuppressionEnabled ? (
              <VolumeX className="h-4 w-4 text-success" />
            ) : (
              <Volume2 className="h-4 w-4 text-foreground-secondary" />
            )}
            <span className="text-sm">Suppression de bruit</span>
          </div>
          <Switch
            checked={noiseSuppressionEnabled}
            onCheckedChange={onToggleNoiseSuppression}
          />
        </div>

        {/* Microphone Test */}
        <div className="space-y-3">
          <div className="flex gap-2">
            {!isMicTesting ? (
              <Button
                onClick={onStartMicTest}
                disabled={isLoading || !selectedAudioId}
                className="flex-1"
                variant="outline"
              >
                <Mic className="h-4 w-4 mr-2" />
                Tester le Micro
              </Button>
            ) : (
              <Button
                onClick={onStopMicTest}
                className="flex-1"
                variant="destructive"
              >
                <VolumeX className="h-4 w-4 mr-2" />
                Arrêter le Test
              </Button>
            )}
          </div>

          {/* Audio Level Meter */}
          {isMicTesting && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                <Volume2 className="h-3 w-3" />
                <span>Niveau audio</span>
              </div>
              <div className="relative h-4 bg-background-secondary rounded-full overflow-hidden border border-glass-border">
                <div
                  className={cn(
                    "h-full transition-all duration-75 rounded-full",
                    audioLevel > 70 ? "bg-destructive" : audioLevel > 40 ? "bg-warning" : "bg-success"
                  )}
                  style={{ width: `${audioLevel}%` }}
                />
                {/* Level markers */}
                <div className="absolute inset-0 flex">
                  <div className="flex-1 border-r border-background/30" />
                  <div className="flex-1 border-r border-background/30" />
                  <div className="flex-1 border-r border-background/30" />
                  <div className="flex-1" />
                </div>
              </div>
              <p className="text-xs text-center text-foreground-muted">
                🎧 Parlez dans le micro - vous devriez entendre votre voix
              </p>
            </div>
          )}
        </div>
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

      {/* Volume Controls */}
      <VolumeSettings />

      {/* Device Info */}
      <div className="pt-4 border-t border-glass-border text-sm text-foreground-secondary space-y-1">
        <p>• {audioInputs.length} microphone(s) détecté(s)</p>
        <p>• {videoInputs.length} caméra(s) détectée(s)</p>
      </div>
    </>
  );
};

// Volume Settings Component
const VolumeSettings = () => {
  const { volume: musicVolume, setVolume: setMusicVolume } = useBackgroundMusic();
  const { volume: sfxVolume, setVolume: setSfxVolume } = useSoundEffectsVolume();

  return (
    <div className="space-y-4 pt-4 border-t border-glass-border">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Volume2 className="h-4 w-4 text-secondary" />
        Volume
      </h4>

      {/* Music Volume */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm flex items-center gap-2">
            <Music className="h-4 w-4 text-primary" />
            Musique
          </label>
          <span className="text-xs text-foreground-muted">{Math.round(musicVolume * 100)}%</span>
        </div>
        <Slider
          value={[musicVolume * 100]}
          onValueChange={(value) => setMusicVolume(value[0] / 100)}
          max={100}
          step={1}
          className="w-full"
        />
      </div>

      {/* SFX Volume */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-accent" />
            Effets sonores
          </label>
          <span className="text-xs text-foreground-muted">{Math.round(sfxVolume * 100)}%</span>
        </div>
        <Slider
          value={[sfxVolume * 100]}
          onValueChange={(value) => setSfxVolume(value[0] / 100)}
          max={100}
          step={1}
          className="w-full"
        />
      </div>
    </div>
  );
};
