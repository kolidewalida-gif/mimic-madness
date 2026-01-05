import { memo } from "react";
import { Play, Sparkles, PartyPopper, Zap, Stars } from "lucide-react";
import { FuturisticBackground } from "./audio-phone/FuturisticBackground";
import { HolographicCard } from "./audio-phone/HolographicCard";
import { NeonButton } from "./audio-phone/NeonButton";
import { StatusBadge } from "./audio-phone/StatusBadge";
import { WaveformVisualizer } from "./audio-phone/WaveformVisualizer";

interface AudioPhoneWaitingRevealPhaseProps {
  isHost: boolean;
  onStartReveal: () => void;
}

export const AudioPhoneWaitingRevealPhase = memo(({
  isHost,
  onStartReveal,
}: AudioPhoneWaitingRevealPhaseProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <FuturisticBackground variant="reveal" />
      
      <HolographicCard glow className="w-full max-w-lg p-8 md:p-10 relative z-10 text-center">
        {/* Animated celebration icons */}
        <div className="relative w-32 h-32 mx-auto mb-6">
          {/* Central icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-2xl shadow-violet-500/30">
              <PartyPopper className="w-10 h-10 text-white" />
            </div>
          </div>
          
          {/* Orbiting elements */}
          <div className="absolute inset-0 animate-[spin_10s_linear_infinite]">
            <Sparkles className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-6 text-amber-400" />
            <Stars className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-5 text-pink-400" />
            <Zap className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400" />
            <Sparkles className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 text-emerald-400" />
          </div>
          
          {/* Pulse rings */}
          <div className="absolute inset-0">
            <div className="absolute inset-2 rounded-full border-2 border-violet-500/30 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-0 rounded-full border border-fuchsia-500/20 animate-ping" style={{ animationDuration: '3s' }} />
          </div>
        </div>

        {/* Status badge */}
        <StatusBadge 
          variant="success" 
          icon={<Sparkles className="w-4 h-4" />}
        >
          Toutes les imitations reçues
        </StatusBadge>

        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-black mt-6 mb-3">
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
            C'est l'heure de
          </span>
          <br />
          <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
            LA RÉVÉLATION !
          </span>
        </h2>
        
        <p className="text-muted-foreground mb-6">
          {isHost 
            ? "Lance la révélation pour découvrir le résultat !" 
            : "En attente de l'hôte pour la révélation..."}
        </p>

        {/* Waveform decoration */}
        <WaveformVisualizer 
          isActive 
          barCount={30} 
          className="h-12 mb-6 opacity-60"
        />

        {/* Action button or waiting indicator */}
        {isHost ? (
          <NeonButton
            onClick={onStartReveal}
            size="xl"
            variant="primary"
            pulse
            icon={<Play className="w-6 h-6" />}
          >
            LANCER LA RÉVÉLATION
          </NeonButton>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div 
                  key={i}
                  className="w-3 h-3 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
            <span className="text-muted-foreground font-medium">
              L'hôte prépare la révélation...
            </span>
          </div>
        )}

        {/* Decorative bottom line */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-1 rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />
      </HolographicCard>
    </div>
  );
});

AudioPhoneWaitingRevealPhase.displayName = "AudioPhoneWaitingRevealPhase";
