import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Play, Pause, SkipForward, RotateCcw, Home, ChevronDown, ChevronUp, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RevealPhraseData {
  original: {
    id: string;
    player_id: string;
    player_name: string;
    originalUrl: string;
    reversedUrl: string | null;
  };
  imitations: Array<{
    id: string;
    imitator_player_id: string;
    imitator_player_name: string;
    reversedUrl: string | null; // This is the RE-reversed = back to normal
  }>;
}

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface SyncState {
  isPlaying: boolean;
  phraseIndex: number;
  step: string; // 'idle' | 'original' | 'reversed' | 'imitation_0' | 'imitation_1' etc.
}

interface AudioPhoneRevealPhaseV2Props {
  revealData: RevealPhraseData[];
  players: Player[];
  isHost: boolean;
  syncState: SyncState;
  onSyncStateChange: (isPlaying: boolean, phraseIndex: number, step: string) => void;
  onPlayAgain: () => void;
  onEndGame: () => void;
}

export const AudioPhoneRevealPhaseV2 = ({
  revealData,
  players,
  isHost,
  syncState,
  onSyncStateChange,
  onPlayAgain,
  onEndGame,
}: AudioPhoneRevealPhaseV2Props) => {
  const [expandedPhrase, setExpandedPhrase] = useState<number | null>(null);
  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastStepRef = useRef<string>('');

  const currentPhrase = revealData[syncState.phraseIndex];

  // Get audio URL for current step
  const getAudioUrlForStep = useCallback((step: string): string | null => {
    if (!currentPhrase) return null;
    
    if (step === 'original') {
      return currentPhrase.original.originalUrl;
    } else if (step === 'reversed') {
      return currentPhrase.original.reversedUrl;
    } else if (step.startsWith('imitation_')) {
      const idx = parseInt(step.split('_')[1], 10);
      const imitation = currentPhrase.imitations[idx];
      // Use reversedUrl which is the RE-reversed imitation (back to normal)
      return imitation?.reversedUrl || null;
    }
    return null;
  }, [currentPhrase]);

  // Get next step in sequence
  const getNextStep = useCallback((currentStep: string): string | null => {
    if (!currentPhrase) return null;
    
    if (currentStep === 'idle' || currentStep === '') {
      return 'original';
    } else if (currentStep === 'original') {
      return 'reversed';
    } else if (currentStep === 'reversed') {
      if (currentPhrase.imitations.length > 0) {
        return 'imitation_0';
      }
      return null; // Done with this phrase
    } else if (currentStep.startsWith('imitation_')) {
      const idx = parseInt(currentStep.split('_')[1], 10);
      if (idx + 1 < currentPhrase.imitations.length) {
        return `imitation_${idx + 1}`;
      }
      return null; // Done with this phrase
    }
    return null;
  }, [currentPhrase]);

  // Play audio for a step
  const playStep = useCallback((step: string) => {
    const url = getAudioUrlForStep(step);
    if (url && audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play().catch(console.error);
      setLocalIsPlaying(true);
    }
  }, [getAudioUrlForStep]);

  // Handle audio ended - advance to next step
  const handleAudioEnded = useCallback(() => {
    setLocalIsPlaying(false);
    
    if (!isHost) return; // Only host controls playback
    
    const nextStep = getNextStep(syncState.step);
    if (nextStep) {
      // Small delay before next audio
      setTimeout(() => {
        onSyncStateChange(true, syncState.phraseIndex, nextStep);
      }, 600);
    } else {
      // Phrase complete
      onSyncStateChange(false, syncState.phraseIndex, 'complete');
    }
  }, [isHost, syncState.step, syncState.phraseIndex, getNextStep, onSyncStateChange]);

  // Sync playback with syncState
  useEffect(() => {
    const stepKey = `${syncState.phraseIndex}_${syncState.step}_${syncState.isPlaying}`;
    
    // Only react to actual changes
    if (stepKey === lastStepRef.current) return;
    lastStepRef.current = stepKey;

    if (syncState.isPlaying && syncState.step && syncState.step !== 'idle' && syncState.step !== 'complete') {
      playStep(syncState.step);
    } else if (!syncState.isPlaying && audioRef.current) {
      audioRef.current.pause();
      setLocalIsPlaying(false);
    }
  }, [syncState.isPlaying, syncState.step, syncState.phraseIndex, playStep]);

  // Host starts playback
  const startPhrasePlayback = () => {
    if (!isHost) return;
    onSyncStateChange(true, syncState.phraseIndex, 'original');
  };

  // Host pauses playback
  const pausePlayback = () => {
    if (!isHost) return;
    onSyncStateChange(false, syncState.phraseIndex, syncState.step);
  };

  // Host goes to next phrase
  const goToNextPhrase = () => {
    if (!isHost) return;
    if (syncState.phraseIndex < revealData.length - 1) {
      onSyncStateChange(false, syncState.phraseIndex + 1, 'idle');
    }
  };

  // Host goes to previous phrase
  const goToPreviousPhrase = () => {
    if (!isHost) return;
    if (syncState.phraseIndex > 0) {
      onSyncStateChange(false, syncState.phraseIndex - 1, 'idle');
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  if (!revealData.length) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 bg-card/60 backdrop-blur-sm border-border/30">
          <p className="text-muted-foreground">Aucune donnée à afficher</p>
        </Card>
      </div>
    );
  }

  const currentStep = syncState.step;
  const currentImitationIndex = currentStep.startsWith('imitation_') 
    ? parseInt(currentStep.split('_')[1], 10) 
    : -1;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <audio ref={audioRef} onEnded={handleAudioEnded} />

      <Card className="w-full max-w-2xl p-6 bg-gradient-to-br from-violet-950/80 to-fuchsia-950/80 border-violet-500/30 backdrop-blur-xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Révélation !
            </h2>
            <p className="text-muted-foreground mt-2">
              Phrase {syncState.phraseIndex + 1} / {revealData.length}
            </p>
            {!isHost && (
              <p className="text-xs text-amber-400 mt-1">
                L'hôte contrôle la lecture
              </p>
            )}
          </div>

          {/* Current phrase card */}
          <Card className="p-6 bg-gradient-to-br from-violet-900/50 to-fuchsia-900/50 border-violet-500/20">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-violet-300">
                  Phrase de {currentPhrase?.original.player_name}
                </h3>
                <div className="flex items-center gap-2">
                  {currentStep !== 'idle' && currentStep !== 'complete' && (
                    <span className={cn(
                      "px-3 py-1 rounded-full text-sm font-medium animate-pulse",
                      currentStep === 'original' && "bg-emerald-500/20 text-emerald-400",
                      currentStep === 'reversed' && "bg-amber-500/20 text-amber-400",
                      currentStep.startsWith('imitation_') && "bg-cyan-500/20 text-cyan-400",
                    )}>
                      {currentStep === 'original' && "🎤 Original"}
                      {currentStep === 'reversed' && "🔄 Inversé"}
                      {currentStep.startsWith('imitation_') && `🗣️ Imitation ${currentImitationIndex + 1}`}
                    </span>
                  )}
                  {currentStep === 'complete' && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400">
                      ✓ Terminé
                    </span>
                  )}
                </div>
              </div>

              {/* Playback controls - only for host */}
              {isHost && (
                <div className="flex justify-center gap-3">
                  <Button
                    onClick={localIsPlaying ? pausePlayback : startPhrasePlayback}
                    size="lg"
                    className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
                  >
                    {localIsPlaying ? (
                      <>
                        <Pause className="w-5 h-5 mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        {currentStep === 'idle' ? 'Démarrer' : currentStep === 'complete' ? 'Rejouer' : 'Reprendre'}
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Non-host sees play indicator */}
              {!isHost && localIsPlaying && (
                <div className="flex justify-center">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/20 text-violet-300">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <div 
                          key={i}
                          className="w-1 h-4 bg-violet-400 rounded-full animate-pulse"
                          style={{ animationDelay: `${i * 150}ms` }}
                        />
                      ))}
                    </div>
                    <span className="text-sm">Lecture en cours...</span>
                  </div>
                </div>
              )}

              {/* Playback sequence visualization */}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <div className={cn(
                  "px-3 py-2 rounded-lg text-sm transition-all",
                  currentStep === 'original' 
                    ? "bg-emerald-500/30 text-emerald-300 ring-2 ring-emerald-400" 
                    : "bg-muted/30 text-muted-foreground"
                )}>
                  <Volume2 className="w-4 h-4 inline mr-1" />
                  Original
                </div>
                <span className="text-muted-foreground">→</span>
                <div className={cn(
                  "px-3 py-2 rounded-lg text-sm transition-all",
                  currentStep === 'reversed' 
                    ? "bg-amber-500/30 text-amber-300 ring-2 ring-amber-400" 
                    : "bg-muted/30 text-muted-foreground"
                )}>
                  <Volume2 className="w-4 h-4 inline mr-1" />
                  Inversé
                </div>
                {currentPhrase?.imitations.map((im, idx) => (
                  <div key={im.id} className="flex items-center gap-2">
                    <span className="text-muted-foreground">→</span>
                    <div className={cn(
                      "px-3 py-2 rounded-lg text-sm transition-all",
                      currentStep === `imitation_${idx}`
                        ? "bg-cyan-500/30 text-cyan-300 ring-2 ring-cyan-400" 
                        : "bg-muted/30 text-muted-foreground"
                    )}>
                      <Volume2 className="w-4 h-4 inline mr-1" />
                      {im.imitator_player_name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Navigation - only for host */}
          {isHost && (
            <div className="flex justify-between items-center">
              <Button
                onClick={goToPreviousPhrase}
                variant="outline"
                disabled={syncState.phraseIndex === 0 || localIsPlaying}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Précédent
              </Button>

              <div className="flex gap-2">
                {revealData.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (!localIsPlaying) {
                        onSyncStateChange(false, idx, 'idle');
                      }
                    }}
                    disabled={localIsPlaying}
                    className={cn(
                      "w-3 h-3 rounded-full transition-all",
                      idx === syncState.phraseIndex 
                        ? "bg-violet-400 scale-125" 
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    )}
                  />
                ))}
              </div>

              <Button
                onClick={goToNextPhrase}
                variant="outline"
                disabled={syncState.phraseIndex === revealData.length - 1 || localIsPlaying}
              >
                Suivant
                <SkipForward className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Pagination dots for non-host */}
          {!isHost && (
            <div className="flex justify-center gap-2">
              {revealData.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "w-3 h-3 rounded-full transition-all",
                    idx === syncState.phraseIndex 
                      ? "bg-violet-400 scale-125" 
                      : "bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>
          )}

          {/* All phrases accordion */}
          <div className="space-y-2 pt-4 border-t border-violet-500/20">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              Toutes les phrases
            </h4>
            {revealData.map((phrase, idx) => (
              <div key={phrase.original.id} className="rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedPhrase(expandedPhrase === idx ? null : idx)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 transition-colors",
                    idx === syncState.phraseIndex 
                      ? "bg-violet-500/20 text-violet-300" 
                      : "bg-muted/10 hover:bg-muted/20 text-foreground"
                  )}
                >
                  <span>{phrase.original.player_name}</span>
                  {expandedPhrase === idx ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {expandedPhrase === idx && (
                  <div className="p-3 bg-muted/5 space-y-2 text-sm">
                    <div className="text-muted-foreground">
                      {phrase.imitations.length} imitation(s)
                    </div>
                    {phrase.imitations.map(im => (
                      <div key={im.id} className="text-muted-foreground">
                        → {im.imitator_player_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* End game actions - only for host */}
          {isHost && (
            <div className="flex gap-3 pt-4">
              <Button
                onClick={onPlayAgain}
                variant="outline"
                className="flex-1"
                disabled={localIsPlaying}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Rejouer
              </Button>
              <Button
                onClick={onEndGame}
                className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                disabled={localIsPlaying}
              >
                <Home className="w-4 h-4 mr-2" />
                Terminer
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
