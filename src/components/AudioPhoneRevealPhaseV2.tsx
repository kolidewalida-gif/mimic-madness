import { useState, useRef, useEffect } from "react";
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
    reversedUrl: string | null;
  }>;
}

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface AudioPhoneRevealPhaseV2Props {
  revealData: RevealPhraseData[];
  players: Player[];
  isHost: boolean;
  onPlayAgain: () => void;
  onEndGame: () => void;
}

type PlaybackStep = 'idle' | 'original' | 'reversed' | 'imitation';

export const AudioPhoneRevealPhaseV2 = ({
  revealData,
  players,
  isHost,
  onPlayAgain,
  onEndGame,
}: AudioPhoneRevealPhaseV2Props) => {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [playbackStep, setPlaybackStep] = useState<PlaybackStep>('idle');
  const [currentImitationIndex, setCurrentImitationIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [expandedPhrase, setExpandedPhrase] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentPhrase = revealData[currentPhraseIndex];

  const playAudio = (url: string, step: PlaybackStep) => {
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play();
      setIsPlaying(true);
      setPlaybackStep(step);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    
    // Auto-advance to next step
    if (playbackStep === 'original' && currentPhrase?.original.reversedUrl) {
      setTimeout(() => {
        playAudio(currentPhrase.original.reversedUrl!, 'reversed');
      }, 500);
    } else if (playbackStep === 'reversed' && currentPhrase?.imitations.length > 0) {
      setCurrentImitationIndex(0);
      const firstImitation = currentPhrase.imitations[0];
      if (firstImitation?.reversedUrl) {
        setTimeout(() => {
          playAudio(firstImitation.reversedUrl!, 'imitation');
        }, 500);
      }
    } else if (playbackStep === 'imitation') {
      const nextImitationIndex = currentImitationIndex + 1;
      if (nextImitationIndex < (currentPhrase?.imitations.length || 0)) {
        setCurrentImitationIndex(nextImitationIndex);
        const nextImitation = currentPhrase.imitations[nextImitationIndex];
        if (nextImitation?.reversedUrl) {
          setTimeout(() => {
            playAudio(nextImitation.reversedUrl!, 'imitation');
          }, 500);
        }
      } else {
        // All done for this phrase
        setPlaybackStep('idle');
      }
    }
  };

  const startPhrasePlayback = () => {
    if (currentPhrase?.original.originalUrl) {
      playAudio(currentPhrase.original.originalUrl, 'original');
    }
  };

  const goToNextPhrase = () => {
    pauseAudio();
    setPlaybackStep('idle');
    setCurrentImitationIndex(0);
    if (currentPhraseIndex < revealData.length - 1) {
      setCurrentPhraseIndex(currentPhraseIndex + 1);
    }
  };

  const goToPreviousPhrase = () => {
    pauseAudio();
    setPlaybackStep('idle');
    setCurrentImitationIndex(0);
    if (currentPhraseIndex > 0) {
      setCurrentPhraseIndex(currentPhraseIndex - 1);
    }
  };

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
              Phrase {currentPhraseIndex + 1} / {revealData.length}
            </p>
          </div>

          {/* Current phrase card */}
          <Card className="p-6 bg-gradient-to-br from-violet-900/50 to-fuchsia-900/50 border-violet-500/20">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-violet-300">
                  Phrase de {currentPhrase?.original.player_name}
                </h3>
                <div className="flex items-center gap-2">
                  {playbackStep !== 'idle' && (
                    <span className={cn(
                      "px-3 py-1 rounded-full text-sm font-medium",
                      playbackStep === 'original' && "bg-emerald-500/20 text-emerald-400",
                      playbackStep === 'reversed' && "bg-amber-500/20 text-amber-400",
                      playbackStep === 'imitation' && "bg-cyan-500/20 text-cyan-400",
                    )}>
                      {playbackStep === 'original' && "Original"}
                      {playbackStep === 'reversed' && "Inversé"}
                      {playbackStep === 'imitation' && `Imitation ${currentImitationIndex + 1}`}
                    </span>
                  )}
                </div>
              </div>

              {/* Playback controls */}
              <div className="flex justify-center gap-3">
                <Button
                  onClick={isPlaying ? pauseAudio : startPhrasePlayback}
                  size="lg"
                  className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-5 h-5 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      {playbackStep === 'idle' ? 'Démarrer' : 'Reprendre'}
                    </>
                  )}
                </Button>
              </div>

              {/* Playback sequence visualization */}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <div className={cn(
                  "px-3 py-2 rounded-lg text-sm transition-all",
                  playbackStep === 'original' 
                    ? "bg-emerald-500/30 text-emerald-300 ring-2 ring-emerald-400" 
                    : "bg-muted/30 text-muted-foreground"
                )}>
                  <Volume2 className="w-4 h-4 inline mr-1" />
                  Original
                </div>
                <span className="text-muted-foreground">→</span>
                <div className={cn(
                  "px-3 py-2 rounded-lg text-sm transition-all",
                  playbackStep === 'reversed' 
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
                      playbackStep === 'imitation' && currentImitationIndex === idx
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

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button
              onClick={goToPreviousPhrase}
              variant="outline"
              disabled={currentPhraseIndex === 0}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Précédent
            </Button>

            <div className="flex gap-2">
              {revealData.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    pauseAudio();
                    setPlaybackStep('idle');
                    setCurrentImitationIndex(0);
                    setCurrentPhraseIndex(idx);
                  }}
                  className={cn(
                    "w-3 h-3 rounded-full transition-all",
                    idx === currentPhraseIndex 
                      ? "bg-violet-400 scale-125" 
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                />
              ))}
            </div>

            <Button
              onClick={goToNextPhrase}
              variant="outline"
              disabled={currentPhraseIndex === revealData.length - 1}
            >
              Suivant
              <SkipForward className="w-4 h-4 ml-2" />
            </Button>
          </div>

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
                    idx === currentPhraseIndex 
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

          {/* End game actions */}
          {isHost && (
            <div className="flex gap-3 pt-4">
              <Button
                onClick={onPlayAgain}
                variant="outline"
                className="flex-1"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Rejouer
              </Button>
              <Button
                onClick={onEndGame}
                className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
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
