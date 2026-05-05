import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Video, StopCircle, Save, Trash2, Play } from "lucide-react";
import { videoStorage, VideoClip } from "@/lib/videoStorageSupabase";
import { VideoTrimEditor } from "@/components/VideoTrimEditor";

interface VideoRecorderProps {
  playerId: string;
  playerName: string;
  onVideoSaved?: (clip: VideoClip) => void;
  lobbyId?: string;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
}

export const VideoRecorder = ({
  playerId,
  playerName,
  onVideoSaved,
  lobbyId,
  onRecordingStart,
  onRecordingStop
}: VideoRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [videoName, setVideoName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  
  const { toast } = useToast();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startRecording = async () => {
    try {
      // Request video and audio
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      setStream(mediaStream);

      // Show live preview
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = mediaStream;
        liveVideoRef.current.play();
      }

      // Setup MediaRecorder with audio+video - try multiple formats
      let options: MediaRecorderOptions = { mimeType: 'video/webm;codecs=vp9,opus' };
      
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm;codecs=vp8,opus' };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm' };
      }

      mediaRecorderRef.current = new MediaRecorder(mediaStream, options);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        
        // Create preview URL
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        
        // Set default video name
        setVideoName(`Imitation ${new Date().toLocaleTimeString()}`);
        
        // Stop the stream
        stopStream();
        
        onRecordingStop?.();
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      onRecordingStart?.();

      toast({
        title: "🎥 Enregistrement démarré",
        description: "Enregistrement vidéo + audio en cours",
      });

    } catch (error: any) {
      console.error("Error accessing camera/microphone:", error);
      
      let errorMessage = "Impossible d'accéder à la caméra ou au microphone.";
      
      if (error.name === "NotAllowedError") {
        errorMessage = "Vous devez autoriser l'accès à la caméra et au microphone.";
      } else if (error.name === "NotFoundError") {
        errorMessage = "Aucune caméra ou microphone détecté.";
      } else if (error.name === "NotReadableError") {
        errorMessage = "La caméra ou le microphone est utilisé par une autre application.";
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSaveClip = async () => {
    if (!recordedBlob || !videoName.trim()) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez nommer votre vidéo",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('Saving video clip:', videoName);
      
      // Create a File from the Blob
      const file = new File([recordedBlob], `${videoName}.webm`, { type: 'video/webm' });
      
      const safeStart = Math.max(0, Math.min(startTime, videoDuration || Number.MAX_SAFE_INTEGER));
      const safeEnd = Math.max(safeStart, Math.min(endTime, videoDuration || Number.MAX_SAFE_INTEGER));
      const trimmedDuration = Math.max(0.1, safeEnd - safeStart);
      
      const clipData = {
        id: `${playerId}-${Date.now()}`,
        name: videoName,
        playerId,
        playerName,
        startTime: safeStart,
        endTime: safeEnd,
        duration: trimmedDuration,
        isMuted: false,
        lobbyId
      };

      const savedClip = await videoStorage.uploadVideo(file, clipData);
      
      onVideoSaved?.(savedClip);
      
      // Reset form
      handleClear();
      
      toast({
        title: "✅ Vidéo sauvegardée !",
        description: `"${videoName}" a été ajoutée avec succès`,
      });
    } catch (error) {
      console.error("Error saving video clip:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la vidéo",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setRecordedBlob(null);
    setVideoName("");
    setStartTime(0);
    setEndTime(0);
    setVideoDuration(0);
    stopStream();
  };

  return (
    <Card className="p-6 bg-background-secondary/50 border-glass-border">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-secondary" />
          <h3 className="text-xl font-semibold text-gradient">
            Enregistrer votre imitation
          </h3>
        </div>

        {!isRecording && !recordedBlob && (
          <div className="space-y-4">
            <p className="text-sm text-foreground-secondary">
              Cliquez pour commencer à enregistrer avec votre caméra et microphone
            </p>
            <Button
              onClick={startRecording}
              variant="hero"
              size="lg"
              className="w-full"
            >
              <Video className="h-5 w-5 mr-2" />
              Démarrer l'enregistrement
            </Button>
          </div>
        )}

        {isRecording && (
          <div className="space-y-4">
            {/* Live preview */}
            <div className="relative">
              <video
                ref={liveVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full aspect-video rounded-lg bg-black"
              />
              <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2 animate-pulse">
                <span className="w-2 h-2 bg-white rounded-full"></span>
                REC
              </div>
            </div>

            <Button
              onClick={stopRecording}
              variant="destructive"
              size="lg"
              className="w-full"
            >
              <StopCircle className="h-5 w-5 mr-2" />
              Arrêter l'enregistrement
            </Button>
          </div>
        )}

        {recordedBlob && previewUrl && (
          <div className="space-y-4">
            {/* Preview recorded video */}
            <video
              ref={videoPreviewRef}
              src={previewUrl}
              className="w-full aspect-video rounded-lg bg-black"
              controls
              playsInline
              preload="metadata"
              onLoadedMetadata={(e) => {
                const el = e.currentTarget as HTMLVideoElement;
                const dur = Number.isFinite(el.duration) ? el.duration : 0;
                if (dur > 0) {
                  setVideoDuration(dur);
                  setStartTime(0);
                  setEndTime(dur);
                }
              }}
              onLoadedData={(e) => {
                const el = e.currentTarget as HTMLVideoElement;
                const dur = Number.isFinite(el.duration) ? el.duration : 0;
                if (dur > 0 && videoDuration === 0) {
                  setVideoDuration(dur);
                  setStartTime(0);
                  setEndTime(dur);
                }
              }}
              onTimeUpdate={(e) => {
                const el = e.currentTarget as HTMLVideoElement;
                if (endTime > 0 && el.currentTime >= endTime) {
                  el.pause();
                  el.currentTime = startTime;
                }
              }}
            />

            {videoDuration > 0 && (
              <VideoTrimEditor
                duration={videoDuration}
                start={startTime}
                end={endTime}
                onChange={(s, e) => {
                  setStartTime(s);
                  setEndTime(e);
                }}
                videoRef={videoPreviewRef}
              />
            )}

            {/* Video Name */}
            <div>
              <label htmlFor="video-name" className="block mb-2 text-sm font-medium">
                Nom de votre imitation
              </label>
              <Input
                id="video-name"
                value={videoName}
                onChange={(e) => setVideoName(e.target.value)}
                placeholder="Ex: Mon imitation"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="hero"
                onClick={handleSaveClip}
                disabled={isLoading}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Sauvegarde..." : "Sauvegarder"}
              </Button>
              <Button
                variant="outline"
                onClick={handleClear}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
