import { useState, useRef, ChangeEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameCard } from "@/components/GameCard";
import { Upload, Play, Pause, Scissors, Trash2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { videoStorage, VideoClip } from "@/lib/videoStorage";

interface VideoUploadProps {
  playerId: string;
  playerName: string;
  maxVideos?: number;
  onVideoSaved?: (clip: VideoClip) => void;
}

export const VideoUpload = ({ 
  playerId, 
  playerName, 
  maxVideos = 5,
  onVideoSaved 
}: VideoUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [clipName, setClipName] = useState("");
  const [savedClips, setSavedClips] = useState<VideoClip[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadSavedClips = async () => {
    try {
      await videoStorage.init();
      const clips = await videoStorage.getVideoClipsByPlayer(playerId);
      setSavedClips(clips);
    } catch (error) {
      console.error("Error loading clips:", error);
    }
  };

  // Load saved clips on component mount
  useEffect(() => {
    loadSavedClips();
  }, [playerId]);

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if we've reached the limit
    if (savedClips.length >= maxVideos) {
      toast({
        title: "Limite atteinte",
        description: `Vous ne pouvez importer que ${maxVideos} vidéos maximum.`,
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith("video/")) {
      toast({
        title: "Format invalide",
        description: "Veuillez sélectionner un fichier vidéo.",
        variant: "destructive",
      });
      return;
    }

    // Check file size (max 400MB)
    if (file.size > 400 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 400 Mo.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setClipName(file.name.replace(/\.[^/.]+$/, ""));
    setIsEditing(true);
    
    // Create video URL and load it
    const videoUrl = URL.createObjectURL(file);
    if (videoRef.current) {
      videoRef.current.src = videoUrl;
    }
  };

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      setVideoDuration(duration);
      setStartTime(0);
      setEndTime(Math.min(10, duration));
    }
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.currentTime = startTime;
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    
    const current = videoRef.current.currentTime;
    setCurrentTime(current);

    // Stop at end time
    if (current >= endTime) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleStartTimeChange = (value: string) => {
    const time = parseFloat(value);
    setStartTime(time);
    if (time >= endTime) {
      setEndTime(Math.min(time + 1, videoDuration));
    }
  };

  const handleEndTimeChange = (value: string) => {
    const time = parseFloat(value);
    if (time - startTime > 10) {
      setEndTime(startTime + 10);
      toast({
        title: "Durée limitée",
        description: "La durée maximale d'un extrait est de 10 secondes.",
        variant: "destructive",
      });
    } else {
      setEndTime(time);
    }
  };

  const saveVideoClip = async () => {
    if (!selectedFile || !videoRef.current) return;

    // Validate clip name
    if (!clipName.trim()) {
      toast({
        title: "Nom requis",
        description: "Veuillez donner un nom à votre extrait vidéo.",
        variant: "destructive",
      });
      return;
    }

    // Validate duration
    if (endTime - startTime > 10) {
      toast({
        title: "Durée invalide",
        description: "La durée maximale d'un extrait est de 10 secondes.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Saving video clip:', clipName);
      
      // Store the entire video file as blob
      const videoBlob = selectedFile;
      
      const clip: VideoClip = {
        id: `${playerId}-${Date.now()}`,
        name: clipName.trim(),
        originalFile: selectedFile,
        startTime,
        endTime,
        duration: endTime - startTime,
        createdAt: new Date(),
        playerId,
      };

      await videoStorage.init();
      await videoStorage.saveVideoClip(clip, videoBlob);
      
      // Reload clips to get the updated list
      const updatedClips = await videoStorage.getVideoClipsByPlayer(playerId);
      setSavedClips(updatedClips);
      
      onVideoSaved?.(clip);

      // Reset form
      setSelectedFile(null);
      setIsEditing(false);
      setClipName("");
      setStartTime(0);
      setEndTime(10);
      
      if (videoRef.current) {
        videoRef.current.src = "";
      }
      
      toast({
        title: "Vidéo sauvegardée !",
        description: `L'extrait "${clip.name}" a été ajouté à votre collection.`,
      });

    } catch (error) {
      console.error("Error saving video:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la vidéo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteClip = async (clipId: string) => {
    try {
      console.log('Deleting clip:', clipId);
      await videoStorage.deleteVideoClip(clipId);
      
      // Reload clips to get updated list
      await loadSavedClips();
      
      toast({
        title: "Vidéo supprimée",
        description: "L'extrait a été retiré de votre collection.",
      });
    } catch (error) {
      console.error("Error deleting clip:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la vidéo.",
        variant: "destructive",
      });
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <GameCard>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gradient">
              Mes Vidéos de Défi ({savedClips.length}/{maxVideos})
            </h3>
            {savedClips.length < maxVideos && (
              <Button
                variant="primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isEditing}
              >
                <Upload className="h-4 w-4" />
                Importer Vidéo
              </Button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Video Editor */}
          {isEditing && selectedFile && (
            <GameCard className="bg-background-secondary/50">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Scissors className="h-5 w-5 text-secondary" />
                  <h4 className="font-medium">Éditeur de Vidéo</h4>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Nom de l'extrait</label>
                  <Input
                    value={clipName}
                    onChange={(e) => setClipName(e.target.value)}
                    placeholder="Donnez un nom à votre extrait..."
                  />
                </div>

                <div className="relative">
                  <video
                    ref={videoRef}
                    onLoadedData={handleVideoLoaded}
                    onTimeUpdate={handleTimeUpdate}
                    className="w-full max-h-64 rounded-lg bg-black"
                    controls={false}
                  />
                  
                  <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handlePlayPause}
                      className="bg-black/50 hover:bg-black/70"
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4 text-white" />
                      ) : (
                        <Play className="h-4 w-4 text-white" />
                      )}
                    </Button>
                    
                    <div className="flex-1 text-white text-sm bg-black/50 px-2 py-1 rounded">
                      {formatTime(currentTime)} / {formatTime(videoDuration)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Début (secondes)</label>
                    <Input
                      type="number"
                      min="0"
                      max={videoDuration}
                      step="0.1"
                      value={startTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fin (secondes)</label>
                    <Input
                      type="number"
                      min={startTime + 0.1}
                      max={videoDuration}
                      step="0.1"
                      value={endTime}
                      onChange={(e) => handleEndTimeChange(e.target.value)}
                    />
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <p className="text-sm text-foreground-secondary">
                    Durée de l'extrait: {formatTime(endTime - startTime)} 
                    {endTime - startTime > 10 && (
                      <span className="text-destructive ml-2">⚠️ Max 10 secondes</span>
                    )}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  
                  <Button
                    variant="hero"
                    onClick={saveVideoClip}
                    disabled={isLoading || endTime - startTime > 10 || !clipName.trim()}
                    className="flex-1"
                  >
                    <Check className="h-4 w-4" />
                    {isLoading ? "Sauvegarde..." : "Sauvegarder"}
                  </Button>
                </div>
              </div>
            </GameCard>
          )}

          {/* Saved Clips List */}
          {savedClips.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-foreground-secondary">
                Extraits sauvegardés
              </h4>
              
              {savedClips.map((clip) => (
                <div
                  key={clip.id}
                  className="flex items-center justify-between p-3 bg-background-secondary/30 rounded-lg group hover:bg-background-secondary/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{clip.name}</p>
                    <p className="text-sm text-foreground-secondary">
                      {formatTime(clip.duration)} • {clip.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteClip(clip.id)}
                    className="text-destructive hover:bg-destructive/20 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {savedClips.length === 0 && !isEditing && (
            <div className="text-center py-8 text-foreground-secondary">
              <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune vidéo importée</p>
              <p className="text-sm">Cliquez sur "Importer Vidéo" pour commencer</p>
            </div>
          )}
        </div>
      </GameCard>
    </div>
  );
};