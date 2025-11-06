import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, Save, Trash2, Video } from "lucide-react";
import { videoStorage, VideoClip } from "@/lib/videoStorageSupabase";
import { VideoTrimEditor } from "@/components/VideoTrimEditor";
interface VideoUploadSimpleProps {
  playerId: string;
  playerName: string;
  maxVideos?: number;
  onVideoSaved?: (clip: VideoClip) => void;
  lobbyId?: string;
}

export const VideoUploadSimple = ({
  playerId,
  playerName,
  maxVideos = 5,
  onVideoSaved,
  lobbyId
}: VideoUploadSimpleProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoName, setVideoName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      const objectUrl = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        setSelectedFile(file);
        setVideoName(file.name.replace(/\.[^/.]+$/, ""));
        setPreviewUrl(objectUrl);
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        setVideoDuration(duration);
        setStartTime(0);
        setEndTime(duration);
      };
      video.src = objectUrl;
    } else {
      toast({
        title: "Fichier invalide",
        description: "Veuillez sélectionner un fichier vidéo",
        variant: "destructive",
      });
    }
  };

  const handleSaveClip = async () => {
    if (!selectedFile || !videoName.trim()) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez remplir tous les champs requis",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('Saving video clip:', videoName);
      
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

      const savedClip = await videoStorage.uploadVideo(selectedFile, clipData);
      
      onVideoSaved?.(savedClip);
      
      // Reset form
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setSelectedFile(null);
      setVideoName("");
      setStartTime(0);
      setEndTime(0);
      setVideoDuration(0);
      
      toast({
        title: "✅ Vidéo sauvegardée !",
        description: `"${videoName}" a été ajoutée à vos défis`,
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
    setSelectedFile(null);
    setVideoName("");
    setStartTime(0);
    setEndTime(0);
    setVideoDuration(0);
  };

  return (
    <Card className="p-6 bg-background-secondary/50 border-glass-border">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-secondary" />
          <h3 className="text-xl font-semibold text-gradient">
            Ajouter une Vidéo
          </h3>
        </div>

        <p className="text-sm text-foreground-secondary">
          Téléchargez une vidéo de votre choix (aucune limite de taille)
        </p>

        {/* File Upload */}
        <div>
          <label htmlFor="video-upload" className="block mb-2 text-sm font-medium">
            Sélectionnez une vidéo
          </label>
          <input
            id="video-upload"
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-secondary file:text-white hover:file:bg-secondary/90 cursor-pointer"
          />
        </div>

        {selectedFile && (
          <>
            {/* Trim Preview */}
            <div className="space-y-3">
              {previewUrl && (
                <video
                  src={previewUrl}
                  className="w-full aspect-video rounded-lg"
                  controls
                  onTimeUpdate={(e) => {
                    const el = e.currentTarget as HTMLVideoElement;
                    const end = endTime || videoDuration || 0;
                    const start = startTime || 0;
                    if (el.currentTime >= end) {
                      el.pause();
                      el.currentTime = start;
                    }
                  }}
                  onLoadedMetadata={(e) => {
                    const el = e.currentTarget as HTMLVideoElement;
                    const dur = Number.isFinite(el.duration) ? el.duration : 0;
                    if (!videoDuration && dur) {
                      setVideoDuration(dur);
                      setStartTime(0);
                      setEndTime(dur);
                    }
                  }}
                />
              )}

              <VideoTrimEditor
                duration={videoDuration}
                start={startTime}
                end={endTime}
                onChange={(s, e) => {
                  setStartTime(s);
                  setEndTime(e);
                }}
              />
            </div>

            {/* Video Name */}
            <div>
              <label htmlFor="video-name" className="block mb-2 text-sm font-medium">
                Nom du défi
              </label>
              <Input
                id="video-name"
                value={videoName}
                onChange={(e) => setVideoName(e.target.value)}
                placeholder="Ex: Extrait de Star Wars"
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
          </>
        )}
      </div>
    </Card>
  );
};