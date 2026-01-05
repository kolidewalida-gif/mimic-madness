import { memo, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Mic, 
  RotateCcw, 
  Headphones, 
  MessageSquare, 
  Users,
  Sparkles,
  Play,
  Zap,
  Radio,
  AudioWaveform
} from "lucide-react";
import { cn } from "@/lib/utils";
import { playSoundEffect } from "@/hooks/useSoundEffects";
import { FuturisticBackground } from "./audio-phone/FuturisticBackground";
import { HolographicCard } from "./audio-phone/HolographicCard";
import { NeonButton } from "./audio-phone/NeonButton";
import { StatusBadge } from "./audio-phone/StatusBadge";
import { WaveformVisualizer } from "./audio-phone/WaveformVisualizer";

interface AudioPhoneInstructionsPhaseProps {
  isHost: boolean;
  playerCount: number;
  onStart: () => void;
}

export const AudioPhoneInstructionsPhase = memo(({
  isHost,
  playerCount,
  onStart,
}: AudioPhoneInstructionsPhaseProps) => {
  const [activeStep, setActiveStep] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % 4);
    }, 2500);
    
    const timer = setTimeout(() => setIsReady(true), 300);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  const steps = [
    {
      icon: Mic,
      title: "ENREGISTREMENT",
      description: "Chaque joueur enregistre une phrase mystère",
      color: "from-emerald-500 to-teal-400",
      iconBg: "bg-emerald-500/20",
      activeGlow: "shadow-emerald-500/50",
    },
    {
      icon: RotateCcw,
      title: "INVERSION",
      description: "L'audio est automatiquement joué à l'envers",
      color: "from-violet-500 to-purple-400",
      iconBg: "bg-violet-500/20",
      activeGlow: "shadow-violet-500/50",
    },
    {
      icon: Headphones,
      title: "ÉCOUTE",
      description: "Les autres écoutent l'audio inversé",
      color: "from-cyan-500 to-blue-400",
      iconBg: "bg-cyan-500/20",
      activeGlow: "shadow-cyan-500/50",
    },
    {
      icon: MessageSquare,
      title: "IMITATION",
      description: "Ils reproduisent ce qu'ils pensent avoir entendu",
      color: "from-amber-500 to-orange-400",
      iconBg: "bg-amber-500/20",
      activeGlow: "shadow-amber-500/50",
    },
  ];

  const handleStart = () => {
    playSoundEffect('start', 0.5);
    onStart();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden relative">
      <FuturisticBackground />

      <div className="relative z-10 w-full max-w-5xl mx-auto space-y-8">
        {/* Header Section */}
        <div className={cn(
          "text-center transition-all duration-700",
          isReady ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8"
        )}>
          {/* Mode Badge */}
          <StatusBadge 
            icon={<Radio className="w-4 h-4" />} 
            variant="default"
            pulse
          >
            <span className="uppercase tracking-wider text-xs">Mode Audio Expérimental</span>
          </StatusBadge>

          {/* Main Title */}
          <div className="mt-6 relative">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter">
              <span className="bg-gradient-to-r from-primary via-accent to-fuchsia-500 bg-[length:200%_auto] animate-gradient bg-clip-text text-transparent">
                AUDIO
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-primary to-violet-500 bg-[length:200%_auto] animate-gradient bg-clip-text text-transparent" style={{ animationDelay: "-1s" }}>
                PHONE
              </span>
            </h1>
            
            {/* Decorative elements around title */}
            <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-24 bg-gradient-to-b from-transparent via-primary to-transparent opacity-50" />
            <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-1 h-24 bg-gradient-to-b from-transparent via-accent to-transparent opacity-50" />
          </div>

          {/* Subtitle with waveform */}
          <div className="mt-6 flex flex-col items-center gap-3">
            <WaveformVisualizer barCount={30} className="h-8 opacity-60" />
            <p className="text-lg md:text-xl text-foreground-secondary max-w-lg mx-auto">
              Le téléphone arabe... <span className="text-primary font-semibold">mais à l'envers !</span>
            </p>
          </div>
        </div>

        {/* Steps Grid */}
        <div className={cn(
          "grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 transition-all duration-700 delay-200",
          isReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = activeStep === index;
            
            return (
              <div
                key={step.title}
                onClick={() => setActiveStep(index)}
                className={cn(
                  "relative cursor-pointer group transition-all duration-500",
                  isActive && "scale-105 z-10"
                )}
              >
                <HolographicCard
                  className={cn(
                    "p-4 md:p-5 h-full",
                    isActive && `shadow-lg ${step.activeGlow}`
                  )}
                  glow={isActive}
                >
                  {/* Step number */}
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    <span className={cn(
                      "text-xs font-mono",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}>
                      0{index + 1}
                    </span>
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      isActive ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
                    )} />
                  </div>

                  {/* Icon */}
                  <div className={cn(
                    "w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center mb-3 transition-all duration-300",
                    step.iconBg,
                    isActive && "scale-110"
                  )}>
                    <Icon className={cn(
                      "w-6 h-6 md:w-7 md:h-7 transition-all",
                      isActive ? "text-foreground" : "text-foreground/70"
                    )} />
                  </div>

                  {/* Content */}
                  <h3 className={cn(
                    "text-sm md:text-base font-bold tracking-wider mb-1 transition-colors",
                    isActive ? "text-foreground" : "text-foreground/80"
                  )}>
                    {step.title}
                  </h3>
                  <p className={cn(
                    "text-xs md:text-sm leading-relaxed transition-colors",
                    isActive ? "text-foreground-secondary" : "text-muted-foreground"
                  )}>
                    {step.description}
                  </p>

                  {/* Active indicator bar */}
                  <div className={cn(
                    "absolute bottom-0 left-1/2 -translate-x-1/2 h-1 rounded-full transition-all duration-300",
                    `bg-gradient-to-r ${step.color}`,
                    isActive ? "w-16 opacity-100" : "w-0 opacity-0"
                  )} />
                </HolographicCard>

                {/* Connection line to next step */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-2 w-4 h-px">
                    <div className={cn(
                      "h-full bg-gradient-to-r from-muted-foreground/30 to-transparent transition-all",
                      isActive && "from-primary/50"
                    )} />
                    <Zap className={cn(
                      "absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-3 transition-all",
                      isActive ? "text-primary" : "text-muted-foreground/30"
                    )} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Reveal Card */}
        <div className={cn(
          "transition-all duration-700 delay-300",
          isReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
          <HolographicCard className="p-5 md:p-6" glow>
            <div className="flex items-start gap-4 md:gap-5">
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 md:w-8 md:h-8 text-amber-400" />
                </div>
                <div className="absolute -inset-1 bg-amber-500/20 rounded-2xl blur-xl animate-pulse" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg md:text-xl font-bold text-foreground">
                    Révélation Finale
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">
                    NOUVEAU
                  </span>
                </div>
                <p className="text-sm md:text-base text-foreground-secondary leading-relaxed">
                  À la fin, tous les enregistrements sont révélés dans l'ordre ! 
                  <span className="text-primary font-medium"> Comparez la phrase originale</span> avec les interprétations successives.
                </p>
              </div>
            </div>
          </HolographicCard>
        </div>

        {/* Footer Section - Players & Start */}
        <div className={cn(
          "flex flex-col items-center gap-5 transition-all duration-700 delay-400",
          isReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
          {/* Player Count */}
          <HolographicCard className="px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Équipage prêt</p>
                <p className="text-2xl font-bold text-foreground">{playerCount} <span className="text-sm font-normal text-muted-foreground">joueurs</span></p>
              </div>
              <div className="w-px h-10 bg-border/50 mx-2" />
              <div className="flex -space-x-2">
                {[...Array(Math.min(playerCount, 5))].map((_, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent border-2 border-background flex items-center justify-center text-xs font-bold text-white"
                    style={{ zIndex: 5 - i }}
                  >
                    {i + 1}
                  </div>
                ))}
                {playerCount > 5 && (
                  <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-bold text-muted-foreground">
                    +{playerCount - 5}
                  </div>
                )}
              </div>
            </div>
          </HolographicCard>

          {/* Start Button or Waiting */}
          {isHost ? (
            <NeonButton
              onClick={handleStart}
              size="xl"
              variant="primary"
              pulse
              icon={<Play className="w-6 h-6" />}
            >
              LANCER LA PARTIE
            </NeonButton>
          ) : (
            <HolographicCard className="px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-primary animate-ping" />
                </div>
                <p className="text-foreground-secondary font-medium">
                  En attente du lancement par l'hôte...
                </p>
                <AudioWaveform className="w-5 h-5 text-primary animate-pulse" />
              </div>
            </HolographicCard>
          )}
        </div>
      </div>
    </div>
  );
});

AudioPhoneInstructionsPhase.displayName = "AudioPhoneInstructionsPhase";
