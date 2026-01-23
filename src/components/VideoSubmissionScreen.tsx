import { useState, useEffect } from "react";
import { GameLogo } from "@/components/GameLogo";
import { VideoUploadSimple } from "@/components/VideoUploadSimple";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/GameCard";
import { ArrowLeft, Send, Clock } from "lucide-react";
import { videoStorage, VideoClip } from "@/lib/videoStorageSupabase";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SubmissionStatus } from "@/components/SubmissionStatus";
import { LobbyChat } from "@/components/LobbyChat";
import { useInkMode } from "@/hooks/useInkMode";
import { cn } from "@/lib/utils";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface VideoSubmissionScreenProps {
  currentPlayer: Player;
  lobbyId: string;
  players: Player[];
  isHost: boolean;
  onBackToLobby: () => void;
  onSubmitChallenges: (selectedClips: VideoClip[]) => void;
  onStartActualGame: () => void;
}

export const VideoSubmissionScreen = ({ 
  currentPlayer,
  lobbyId,
  players,
  isHost,
  onBackToLobby, 
  onSubmitChallenges,
  onStartActualGame
}: VideoSubmissionScreenProps) => {
  const { isInkMode } = useInkMode();
  const [savedClips, setSavedClips] = useState<VideoClip[]>([]);
  const [selectedClips, setSelectedClips] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPlayerClips();
  }, [currentPlayer.id]);

  const loadPlayerClips = async () => {
    try {
      const clips = await videoStorage.getVideoClipsByPlayer(currentPlayer.id);
      setSavedClips(clips);
    } catch (error) {
      console.error("Error loading clips:", error);
    }
  };

  const handleClipSaved = (newClip: VideoClip) => {
    setSavedClips([...savedClips, newClip]);
  };

  const toggleClipSelection = (clipId: string) => {
    setSelectedClips(prev => {
      if (prev.includes(clipId)) {
        return prev.filter(id => id !== clipId);
      } else {
        if (prev.length >= 3) {
          toast({
            title: "Limite atteinte",
            description: "Vous ne pouvez sélectionner que 3 défis maximum pour cette partie.",
            variant: "destructive",
          });
          return prev;
        }
        return [...prev, clipId];
      }
    });
  };

  const handleSubmitChallenges = async () => {
    if (selectedClips.length === 0) {
      toast({
        title: "Aucun défi sélectionné",
        description: "Veuillez sélectionner au moins un extrait vidéo comme défi.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const clipsToSubmit = savedClips.filter(clip => selectedClips.includes(clip.id));
      
      console.log('Submitting challenges:', clipsToSubmit);
      
      // Save submission to database
      const { error } = await supabase
        .from('player_submissions')
        .upsert({
          lobby_id: lobbyId,
          player_id: currentPlayer.id,
          player_name: currentPlayer.name,
          challenges_count: clipsToSubmit.length,
        }, {
          onConflict: 'lobby_id,player_id'
        });
      
      if (error) {
        console.error('Error saving submission:', error);
        throw error;
      }
      
      onSubmitChallenges(clipsToSubmit);
      
      toast({
        title: "✅ Défis soumis avec succès !",
        description: `${selectedClips.length} défi(s) envoyé(s). Vos vidéos sont prêtes pour la partie !`,
      });
      
      // Clear selection after successful submit
      setSelectedClips([]);
      
    } catch (error) {
      console.error("Error submitting challenges:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer les défis. Réessayez.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn(
      "h-screen p-6 overflow-y-auto",
      isInkMode ? "bg-background" : "animated-bg"
    )}>
      {/* Ink mode subtle glow */}
      {isInkMode && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-15 z-0">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary rounded-full blur-[120px]" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-primary rounded-full blur-[100px]" />
        </div>
      )}
      <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn relative z-10">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onBackToLobby}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au Lobby
          </Button>
          <GameLogo size="md" />
          <div className="w-24" /> {/* Spacer */}
        </div>

        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-gradient">
            Préparez vos Défis Vidéo
          </h2>
          <p className="text-foreground-secondary text-lg">
            Importez et éditez vos vidéos, puis sélectionnez vos meilleurs défis pour la partie.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Video Upload Section */}
          <div className="space-y-4">
            <VideoUploadSimple
              playerId={currentPlayer.id}
              playerName={currentPlayer.name}
              maxVideos={5}
              onVideoSaved={handleClipSaved}
              lobbyId={lobbyId}
            />
          </div>

          {/* Challenge Selection Section */}
          <div className="space-y-4">
            <GameCard>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-secondary" />
                  <h3 className="text-xl font-semibold text-gradient">
                    Sélection des Défis
                  </h3>
                </div>

                <p className="text-foreground-secondary text-sm">
                  Choisissez jusqu'à 3 extraits vidéo qui serviront de défis pour cette partie.
                </p>

                {savedClips.length > 0 ? (
                  <div className="space-y-3">
                    {savedClips.map((clip) => (
                      <div
                        key={clip.id}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
                          selectedClips.includes(clip.id)
                            ? "border-primary bg-primary/10 glow-primary"
                            : "border-glass-border bg-background-secondary/30 hover:border-primary/50"
                        }`}
                        onClick={() => toggleClipSelection(clip.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground">{clip.name}</h4>
                            <p className="text-sm text-foreground-secondary">
                              Durée: {Math.round(clip.duration)}s • 
                              {clip.createdAt.toLocaleDateString()}
                            </p>
                          </div>
                          
                          <div className={`w-6 h-6 rounded-full border-2 transition-all ${
                            selectedClips.includes(clip.id)
                              ? "border-primary bg-primary"
                              : "border-glass-border"
                          }`}>
                            {selectedClips.includes(clip.id) && (
                              <div className="w-full h-full rounded-full bg-white scale-50"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="pt-4 border-t border-glass-border">
                      <div className="flex items-center justify-between text-sm text-foreground-secondary mb-4">
                        <span>Défis sélectionnés: {selectedClips.length}/3</span>
                      </div>

                      <Button
                        variant="hero"
                        size="lg"
                        onClick={handleSubmitChallenges}
                        disabled={selectedClips.length === 0 || isSubmitting}
                        className="w-full"
                      >
                        <Send className="h-5 w-5" />
                        {isSubmitting 
                          ? "Envoi en cours..." 
                          : `Soumettre ${selectedClips.length} Défi(s)`
                        }
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-foreground-secondary">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun extrait vidéo disponible</p>
                    <p className="text-sm">Importez d'abord des vidéos pour créer des défis</p>
                  </div>
                )}
              </div>
            </GameCard>
          </div>
          
          {/* Submission Status Section */}
          <div className="space-y-4">
            <SubmissionStatus
              lobbyId={lobbyId}
              players={players}
              isHost={isHost}
              onStartGame={onStartActualGame}
            />
          </div>
        </div>
      </div>

      {/* Global Chat */}
      <LobbyChat
        lobbyId={lobbyId}
        playerId={currentPlayer.id}
        playerName={currentPlayer.name}
      />
    </div>
  );
};