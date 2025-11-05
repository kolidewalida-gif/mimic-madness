import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, Save, Trash2, Video } from "lucide-react";
import { videoStorage, VideoClip } from "@/lib/videoStorageSupabase";

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
  
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      // Vérifier la durée max (30 secondes)
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        if (video.duration > 30) {
          toast({
            title: "Vidéo trop longue",
            description: "Veuillez sélectionner une vidéo de maximum 30 secondes",
            variant: "destructive",
          });
          return;
        }
        setSelectedFile(file);
        setVideoName(file.name.replace(/\.[^/.]+$/, ""));
      };
      video.src = URL.createObjectURL(file);
    } else {
      toast({
        title: "Fichier invalide",
        description: "Veuillez sélectionner un fichier vidéo (max 30s)",
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
      
      // Obtenir la durée de la vidéo
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(video.src);
          resolve();
        };
        video.src = URL.createObjectURL(selectedFile);
      });
      
      const clipData = {
        id: `${playerId}-${Date.now()}`,
        name: videoName,
        playerId,
        playerName,
        startTime: 0,
        endTime: video.duration,
        duration: video.duration,
        isMuted: false,
        lobbyId
      };

      const savedClip = await videoStorage.uploadVideo(selectedFile, clipData);
      
      onVideoSaved?.(savedClip);
      
      // Reset form
      setSelectedFile(null);
      setVideoName("");
      
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
    setSelectedFile(null);
    setVideoName("");
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
          Téléchargez une vidéo courte (max 30 secondes)
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