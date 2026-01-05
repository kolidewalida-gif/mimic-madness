import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Play, Pause, SkipForward, RotateCcw, Home, ChevronDown, ChevronUp, Volume2, Sparkles, Trophy, AudioWaveform } from "lucide-react";
import { cn } from "@/lib/utils";
import { FuturisticBackground } from "./audio-phone/FuturisticBackground";
import { HolographicCard } from "./audio-phone/HolographicCard";
import { NeonButton } from "./audio-phone/NeonButton";
import { StatusBadge } from "./audio-phone/StatusBadge";
import { WaveformVisualizer } from "./audio-phone/WaveformVisualizer";

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

interface SyncState {
  isPlaying: boolean;
  phraseIndex: number;
  step: string;
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

export const AudioPhoneRevealPhaseV2 = memo(({
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

  const currentPhrase = revealData[syncState.phraseIndex] || null;

  const getAudioUrlForStep = useCallback((step: string): string | null => {
    const phrase = revealData[syncState.phraseIndex];
    if (!phrase) return null;
    
    if (step === 'original') {
      return phrase.original.originalUrl;
    } else if (step === 'reversed') {
      return phrase.original.reversedUrl;
    } else if (step.startsWith('imitation_')) {
      const idx = parseInt(step.split('_')[1], 10);
      const imitation = phrase.imitations[idx];
      return imitation?.reversedUrl || null;
    }
    return null;
  }, [revealData, syncState.phraseIndex]);

  const getNextStep = useCallback((currentStep: string): string | null => {
    const phrase = revealData[syncState.phraseIndex];
    if (!phrase) return null;
    
    if (currentStep === 'idle' || currentStep === '') {
      return 'original';
    } else if (currentStep === 'original') {
      return 'reversed';
    } else if (currentStep === 'reversed') {
      if (phrase.imitations.length > 0) {
        return 'imitation_0';
      }
      return null;
    } else if (currentStep.startsWith('imitation_')) {
      const idx = parseInt(currentStep.split('_')[1], 10);
      if (idx + 1 < phrase.imitations.length) {
        return `imitation_${idx + 1}`;
      }
      return null;
    }
    return null;
  }, [revealData, syncState.phraseIndex]);

  const playStep = useCallback((step: string) => {
    const url = getAudioUrlForStep(step);
    if (url && audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play().catch(console.error);
      setLocalIsPlaying(true);
    }
  }, [getAudioUrlForStep]);

  const handleAudioEnded = useCallback(() => {
    setLocalIsPlaying(false);
    
    if (!isHost) return;
    
    const nextStep = getNextStep(syncState.step);
    if (nextStep) {
      setTimeout(() => {
        onSyncStateChange(true, syncState.phraseIndex, nextStep);
      }, 600);
    } else {
      onSyncStateChange(false, syncState.phraseIndex, 'complete');
    }
  }, [isHost, syncState.step, syncState.phraseIndex, getNextStep, onSyncStateChange]);

  useEffect(() => {
    const stepKey = `${syncState.phraseIndex}_${syncState.step}_${syncState.isPlaying}`;
    
    if (stepKey === lastStepRef.current) return;
    lastStepRef.current = stepKey;

    if (syncState.isPlaying && syncState.step && syncState.step !== 'idle' && syncState.step !== 'complete') {
      playStep(syncState.step);
    } else if (!syncState.isPlaying && audioRef.current) {
      audioRef.current.pause();
      setLocalIsPlaying(false);
    }
  }, [syncState.isPlaying, syncState.step, syncState.phraseIndex, playStep]);

  const startPhrasePlayback = () => {
    if (!isHost) return;
    onSyncStateChange(true, syncState.phraseIndex, 'original');
  };

  const pausePlayback = () => {
    if (!isHost) return;
    onSyncStateChange(false, syncState.phraseIndex, syncState.step);
  };

  const goToNextPhrase = () => {
    if (!isHost) return;
    if (syncState.phraseIndex < revealData.length - 1) {
      onSyncStateChange(false, syncState.phraseIndex + 1, 'idle');
    }
  };

  const goToPreviousPhrase = () => {
    if (!isHost) return;
    if (syncState.phraseIndex > 0) {
      onSyncStateChange(false, syncState.phraseIndex - 1, 'idle');
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
        <FuturisticBackground variant="reveal" />
        <HolographicCard className="p-8 relative z-10">
          <p className="text-muted-foreground">Aucune donnée à afficher</p>
        </HolographicCard>
      </div>
    );
  }

  const currentStep = syncState.step;
  const currentImitationIndex = currentStep.startsWith('imitation_') 
    ? parseInt(currentStep.split('_')[1], 10) 
    : -1;

  // Build the timeline of steps for current phrase
  const timelineSteps = currentPhrase ? [
    { key: 'original', label: 'Original', playerName: currentPhrase.original.player_name, type: 'original' },
    { key: 'reversed', label: 'Inversé', playerName: currentPhrase.original.player_name, type: 'reversed' },
    ...currentPhrase.imitations.map((im, idx) => ({
      key: `imitation_${idx}`,
      label: `Imitation`,
      playerName: im.imitator_player_name,
      type: 'imitation',
    })),
  ] : [];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <FuturisticBackground variant="reveal" />
      <audio ref={audioRef} onEnded={handleAudioEnded} />

      <div className="w-full max-w-3xl relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center">
          <StatusBadge 
            icon={<Sparkles className="w-4 h-4" />} 
            variant="default"
            pulse
          >
            Révélation en cours
          </StatusBadge>
          
          <h1 className="text-4xl md:text-5xl font-black mt-4 mb-2">
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              LA RÉVÉLATION
            </span>
          </h1>
          
          {!isHost && (
            <p className="text-sm text-amber-400/80">
              L'hôte contrôle la lecture
            </p>
          )}
        </div>

        {/* Phrase navigation dots */}
        <div className="flex justify-center gap-2">
          {revealData.map((phrase, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (isHost && !localIsPlaying) {
                  onSyncStateChange(false, idx, 'idle');
                }
              }}
              disabled={!isHost || localIsPlaying}
              className={cn(
                "relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                idx === syncState.phraseIndex 
                  ? "bg-gradient-to-br from-primary to-fuchsia-500 scale-110 shadow-lg shadow-primary/30" 
                  : "bg-muted/30 hover:bg-muted/50",
                !isHost && "cursor-default"
              )}
            >
              <span className={cn(
                "text-sm font-bold",
                idx === syncState.phraseIndex ? "text-white" : "text-muted-foreground"
              )}>
                {idx + 1}
              </span>
              {idx === syncState.phraseIndex && currentStep === 'complete' && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Trophy className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Main playback card */}
        <HolographicCard glow className="p-6 md:p-8">
          <div className="space-y-6">
            {/* Phrase author header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Phrase originale de</p>
                <h3 className="text-2xl font-bold text-foreground">
                  {currentPhrase?.original.player_name}
                </h3>
              </div>
              
              {/* Current step badge */}
              {currentStep !== 'idle' && currentStep !== 'complete' && (
                <StatusBadge 
                  variant={
                    currentStep === 'original' ? "success" : 
                    currentStep === 'reversed' ? "warning" : 
                    "info"
                  }
                  icon={<AudioWaveform className="w-4 h-4" />}
                  pulse={localIsPlaying}
                >
                  {currentStep === 'original' && "🎤 Original"}
                  {currentStep === 'reversed' && "🔄 Inversé"}
                  {currentStep.startsWith('imitation_') && `🗣️ Imitation ${currentImitationIndex + 1}`}
                </StatusBadge>
              )}
              
              {currentStep === 'complete' && (
                <StatusBadge variant="success" icon={<Trophy className="w-4 h-4" />}>
                  Terminé !
                </StatusBadge>
              )}
            </div>

            {/* Waveform visualization */}
            <div className="py-4">
              <WaveformVisualizer 
                isActive={localIsPlaying}
                barCount={50}
                variant={localIsPlaying ? "playing" : "default"}
                className="h-16"
              />
            </div>

            {/* Timeline visualization */}
            <div className="relative">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/20 via-amber-500/20 to-cyan-500/20 -translate-y-1/2" />
              
              <div className="relative flex justify-between">
                {timelineSteps.map((step, idx) => {
                  const isActive = currentStep === step.key;
                  const isPast = timelineSteps.findIndex(s => s.key === currentStep) > idx || currentStep === 'complete';
                  
                  return (
                    <div 
                      key={step.key}
                      className="flex flex-col items-center gap-2"
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                        isActive 
                          ? step.type === 'original' ? "bg-emerald-500 border-emerald-400 scale-110 shadow-lg shadow-emerald-500/30" :
                            step.type === 'reversed' ? "bg-amber-500 border-amber-400 scale-110 shadow-lg shadow-amber-500/30" :
                            "bg-cyan-500 border-cyan-400 scale-110 shadow-lg shadow-cyan-500/30"
                          : isPast 
                            ? "bg-muted border-muted-foreground/30"
                            : "bg-muted/30 border-border/50"
                      )}>
                        {isActive && localIsPlaying ? (
                          <div className="flex gap-0.5">
                            {[0, 1, 2].map(i => (
                              <div 
                                key={i}
                                className="w-1 h-4 bg-white rounded-full animate-pulse"
                                style={{ animationDelay: `${i * 150}ms` }}
                              />
                            ))}
                          </div>
                        ) : (
                          <Volume2 className={cn(
                            "w-5 h-5",
                            isActive || isPast ? "text-white" : "text-muted-foreground"
                          )} />
                        )}
                      </div>
                      
                      <div className="text-center max-w-[80px]">
                        <p className={cn(
                          "text-xs font-medium truncate",
                          isActive ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {step.playerName}
                        </p>
                        <p className={cn(
                          "text-[10px]",
                          isActive 
                            ? step.type === 'original' ? "text-emerald-400" :
                              step.type === 'reversed' ? "text-amber-400" :
                              "text-cyan-400"
                            : "text-muted-foreground/60"
                        )}>
                          {step.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Playback controls */}
            {isHost && (
              <div className="flex justify-center gap-3 pt-4">
                <NeonButton
                  onClick={goToPreviousPhrase}
                  variant="info"
                  disabled={syncState.phraseIndex === 0 || localIsPlaying}
                  icon={<RotateCcw className="w-4 h-4" />}
                >
                  Précédent
                </NeonButton>
                
                <NeonButton
                  onClick={localIsPlaying ? pausePlayback : startPhrasePlayback}
                  variant="primary"
                  size="lg"
                  pulse={!localIsPlaying}
                  icon={localIsPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                >
                  {localIsPlaying ? 'Pause' : currentStep === 'idle' ? 'Démarrer' : currentStep === 'complete' ? 'Rejouer' : 'Reprendre'}
                </NeonButton>
                
                <NeonButton
                  onClick={goToNextPhrase}
                  variant="info"
                  disabled={syncState.phraseIndex === revealData.length - 1 || localIsPlaying}
                  icon={<SkipForward className="w-4 h-4" />}
                >
                  Suivant
                </NeonButton>
              </div>
            )}

            {/* Non-host play indicator */}
            {!isHost && localIsPlaying && (
              <div className="flex justify-center">
                <StatusBadge variant="default" pulse icon={<AudioWaveform className="w-4 h-4" />}>
                  Lecture en cours...
                </StatusBadge>
              </div>
            )}
          </div>
        </HolographicCard>

        {/* All phrases accordion */}
        <HolographicCard className="p-4 md:p-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Toutes les phrases
          </h4>
          
          <div className="space-y-2">
            {revealData.map((phrase, idx) => (
              <div key={phrase.original.id} className="rounded-xl overflow-hidden border border-border/30">
                <button
                  onClick={() => setExpandedPhrase(expandedPhrase === idx ? null : idx)}
                  className={cn(
                    "w-full flex items-center justify-between p-4 transition-colors",
                    idx === syncState.phraseIndex 
                      ? "bg-primary/20 text-foreground" 
                      : "bg-muted/10 hover:bg-muted/20 text-foreground/80"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      idx === syncState.phraseIndex 
                        ? "bg-primary text-white" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {idx + 1}
                    </div>
                    <span className="font-medium">{phrase.original.player_name}</span>
                    <span className="text-xs text-muted-foreground">
                      • {phrase.imitations.length} imitation(s)
                    </span>
                  </div>
                  {expandedPhrase === idx ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
                
                {expandedPhrase === idx && (
                  <div className="p-4 bg-muted/5 space-y-2 border-t border-border/20">
                    {phrase.imitations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucune imitation</p>
                    ) : (
                      phrase.imitations.map((im, imIdx) => (
                        <div key={im.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                            <span className="text-xs text-cyan-400">{imIdx + 1}</span>
                          </div>
                          <span>→</span>
                          <span className="text-foreground">{im.imitator_player_name}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </HolographicCard>

        {/* End game actions */}
        {isHost && (
          <div className="flex gap-4 justify-center">
            <NeonButton
              onClick={onPlayAgain}
              variant="info"
              disabled={localIsPlaying}
              icon={<RotateCcw className="w-4 h-4" />}
            >
              Rejouer
            </NeonButton>
            <NeonButton
              onClick={onEndGame}
              variant="danger"
              disabled={localIsPlaying}
              icon={<Home className="w-4 h-4" />}
            >
              Terminer
            </NeonButton>
          </div>
        )}
      </div>
    </div>
  );
});

AudioPhoneRevealPhaseV2.displayName = "AudioPhoneRevealPhaseV2";
