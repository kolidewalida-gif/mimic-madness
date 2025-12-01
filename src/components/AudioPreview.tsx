import { useEffect, useState } from "react";
import { videoStorage } from "@/lib/videoStorageSupabase";
import { AlertCircle } from "lucide-react";

interface AudioPreviewProps {
  clipId: string;
  className?: string;
  autoPlay?: boolean;
}

export const AudioPreview = ({ 
  clipId, 
  className = "",
  autoPlay = false
}: AudioPreviewProps) => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const loadAudio = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const clip = await videoStorage.getVideoClip(clipId);
        if (!mounted) return;
        
        if (!clip) {
          setError("Audio introuvable");
          return;
        }

        const url = await videoStorage.getVideoUrl(clipId);
        
        if (!url) {
          setError("Audio introuvable");
          return;
        }
        
        setAudioUrl(url);
      } catch (err) {
        console.error("Error loading audio:", err);
        if (mounted) {
          setError("Erreur de chargement");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadAudio();
    
    return () => {
      mounted = false;
    };
  }, [clipId]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg p-8 ${className}`}>
        <div className="text-center text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg p-8 ${className}`}>
        <div className="text-center text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-background-secondary/50 rounded-lg p-8 ${className}`}>
      {audioUrl && (
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="text-6xl">🎤</div>
          </div>
          <audio
            src={audioUrl}
            className="w-full"
            controls
            autoPlay={autoPlay}
            crossOrigin="anonymous"
            onError={() => setError("Erreur de lecture de l'audio")}
          />
        </div>
      )}
    </div>
  );
};
