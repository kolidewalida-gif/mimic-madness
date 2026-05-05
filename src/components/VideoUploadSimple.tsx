import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, Save, Trash2, Video, Sparkles, Loader2 } from "lucide-react";
import { videoStorage, VideoClip } from "@/lib/videoStorageSupabase";
import { VideoTrimEditor } from "@/components/VideoTrimEditor";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

interface Subtitle {
  start: number;
  end: number;
  text: string;
}

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
  const [enableAISubtitles, setEnableAISubtitles] = useState(false);
  const [isGeneratingSubtitles, setIsGeneratingSubtitles] = useState(false);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>("");
  const videoPreviewRef = useState<HTMLVideoElement | null>(null)[0];
  const videoRef = { current: videoPreviewRef };
  
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier que c'est une vidéo (accepter formats courants)
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska'];
    const isVideo = file.type.startsWith('video/') || validTypes.includes(file.type);
    
    if (!isVideo) {
      toast({
        title: "Format invalide",
        description: "Formats acceptés: MP4, WebM, MOV, MKV, OGG",
        variant: "destructive",
      });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast({
        title: "Erreur de lecture",
        description: "Impossible de lire cette vidéo. Essayez un autre format (MP4 recommandé).",
        variant: "destructive",
      });
    };

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      
      if (duration === 0) {
        URL.revokeObjectURL(objectUrl);
        toast({
          title: "Vidéo invalide",
          description: "Cette vidéo semble corrompue ou vide",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      setVideoName(file.name.replace(/\.[^/.]+$/, ""));
      setPreviewUrl(objectUrl);
      setVideoDuration(duration);
      setStartTime(0);
      setEndTime(duration);
    };
    
    video.src = objectUrl;
  };

  const generateAISubtitles = async () => {
    if (!videoDuration) return;
    
    setIsGeneratingSubtitles(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-subtitles', {
        body: {
          videoDescription: videoName || "Vidéo de défi d'imitation",
          duration: endTime - startTime
        }
      });

      if (error) throw error;

      if (data?.subtitles) {
        setSubtitles(data.subtitles);
        toast({
          title: "🎬 Sous-titres générés !",
          description: "Les sous-titres IA ont été ajoutés à votre vidéo",
        });
      }
    } catch (error: any) {
      console.error("Error generating subtitles:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer les sous-titres",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSubtitles(false);
    }
  };

  const updateCurrentSubtitle = (currentTime: number) => {
    const relativeTime = currentTime - startTime;
    const active = subtitles.find(
      sub => relativeTime >= sub.start && relativeTime <= sub.end
    );
    setCurrentSubtitle(active?.text || "");
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
    setSubtitles([]);
    setCurrentSubtitle("");
    setEnableAISubtitles(false);
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
          Téléchargez une vidéo (MP4, WebM, MOV recommandés)
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
            {/* Trim Preview with Subtitles */}
            <div className="space-y-3">
              {previewUrl && (
                <div className="relative">
                  <video
                    ref={(el) => {
                      if (el) (videoRef as any).current = el;
                    }}
                    src={previewUrl}
                    className="w-full aspect-video rounded-lg bg-black"
                    controls
                    onTimeUpdate={(e) => {
                      const el = e.currentTarget as HTMLVideoElement;
                      if (el.currentTime >= endTime) {
                        el.pause();
                        el.currentTime = startTime;
                      }
                      updateCurrentSubtitle(el.currentTime);
                    }}
                    onLoadedMetadata={(e) => {
                      const el = e.currentTarget as HTMLVideoElement;
                      const dur = Number.isFinite(el.duration) ? el.duration : 0;
                      if (dur > 0) {
                        setVideoDuration(dur);
                        setStartTime(0);
                        setEndTime(dur);
                      }
                    }}
                  />
                  {/* Subtitle Overlay - Bande Rythmo Style */}
                  {currentSubtitle && (
                    <div className="absolute bottom-12 left-0 right-0 flex justify-center pointer-events-none">
                      <div className="bg-gradient-to-r from-primary/90 via-secondary/90 to-accent/90 px-4 py-2 rounded-lg shadow-lg border border-white/20">
                        <p className="text-white font-bold text-lg text-center drop-shadow-lg animate-pulse">
                          {currentSubtitle}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <VideoTrimEditor
                duration={videoDuration}
                start={startTime}
                end={endTime}
                onChange={(s, e) => {
                  setStartTime(s);
                  setEndTime(e);
                }}
                videoRef={videoRef as any}
              />
            </div>

            {/* AI Subtitles Option */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Sous-titres IA</p>
                  <p className="text-xs text-foreground-secondary">Bande rythmo générée automatiquement</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={enableAISubtitles}
                  onCheckedChange={setEnableAISubtitles}
                />
                {enableAISubtitles && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateAISubtitles}
                    disabled={isGeneratingSubtitles}
                    className="gap-2"
                  >
                    {isGeneratingSubtitles ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Générer
                  </Button>
                )}
              </div>
            </div>

            {/* Generated Subtitles Preview */}
            {subtitles.length > 0 && (
              <div className="space-y-2 p-3 rounded-lg bg-background-secondary/50 border border-glass-border">
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Sous-titres générés ({subtitles.length})
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {subtitles.map((sub, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="text-foreground-secondary text-xs font-mono">
                        {sub.start.toFixed(1)}s - {sub.end.toFixed(1)}s
                      </span>
                      <span className="text-foreground">{sub.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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