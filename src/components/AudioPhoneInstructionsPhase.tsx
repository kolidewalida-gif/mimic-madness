import { memo, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Mic, 
  RotateCcw, 
  Headphones, 
  MessageSquare, 
  ArrowRight,
  Users,
  Sparkles,
  Volume2,
  Play,
  Waves
} from "lucide-react";
import { cn } from "@/lib/utils";
import { playSoundEffect } from "@/hooks/useSoundEffects";

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

  // Animate through steps
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % 4);
    }, 2500);
    
    const timer = setTimeout(() => setIsReady(true), 500);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  const steps = [
    {
      icon: Mic,
      title: "Enregistrez",
      description: "Le premier joueur enregistre une phrase claire",
      color: "from-emerald-500 to-teal-500",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/30",
    },
    {
      icon: RotateCcw,
      title: "Inversion",
      description: "L'audio est automatiquement joué à l'envers",
      color: "from-violet-500 to-purple-500",
      bgColor: "bg-violet-500/10",
      borderColor: "border-violet-500/30",
    },
    {
      icon: Headphones,
      title: "Écoutez",
      description: "Le joueur suivant écoute l'audio inversé",
      color: "from-cyan-500 to-blue-500",
      bgColor: "bg-cyan-500/10",
      borderColor: "border-cyan-500/30",
    },
    {
      icon: MessageSquare,
      title: "Reproduisez",
      description: "Il enregistre ce qu'il pense avoir compris",
      color: "from-amber-500 to-orange-500",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/30",
    },
  ];

  const handleStart = () => {
    playSoundEffect('start', 0.5);
    onStart();
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-primary/30 to-accent/20 rounded-full blur-3xl animate-float opacity-50" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-secondary/30 to-primary/20 rounded-full blur-3xl animate-float-delayed opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-accent/10 to-primary/10 rounded-full blur-3xl animate-pulse-slow opacity-30" />
        
        {/* Sound wave decorations */}
        <div className="absolute top-1/4 right-20 opacity-20">
          <Waves className="w-24 h-24 text-primary animate-pulse" />
        </div>
        <div className="absolute bottom-1/4 left-20 opacity-20">
          <Volume2 className="w-20 h-20 text-accent animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
      </div>

      {/* Header */}
      <div className={cn(
        "text-center mb-10 relative z-10 transition-all duration-700",
        isReady ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8"
      )}>
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary/20 via-accent/15 to-secondary/20 border border-primary/30 mb-6 backdrop-blur-sm">
          <div className="relative">
            <Volume2 className="h-4 w-4 text-primary" />
            <div className="absolute inset-0 animate-ping">
              <Volume2 className="h-4 w-4 text-primary opacity-50" />
            </div>
          </div>
          <span className="text-sm font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Mode Audio
          </span>
        </div>
        
        {/* Title with gradient animation */}
        <h1 className="text-5xl md:text-7xl font-black mb-4 relative">
          <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-[length:200%_auto] animate-gradient bg-clip-text text-transparent">
            Audio Phone
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-foreground-secondary max-w-lg mx-auto leading-relaxed">
          Le téléphone arabe version audio inversé ! 
          <span className="text-primary font-medium"> Saurez-vous décoder le message ?</span>
        </p>
      </div>

      {/* Steps Grid - Interactive */}
      <div className={cn(
        "grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl w-full mb-10 relative z-10 transition-all duration-700 delay-200",
        isReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}>
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = activeStep === index;
          
          return (
            <Card 
              key={step.title}
              className={cn(
                "relative p-5 md:p-6 overflow-hidden transition-all duration-500 cursor-pointer group",
                "bg-card/40 backdrop-blur-md border-border/30",
                isActive && `${step.bgColor} ${step.borderColor} scale-105 shadow-lg`,
                !isActive && "hover:scale-[1.02] hover:bg-card/60"
              )}
              onClick={() => setActiveStep(index)}
            >
              {/* Step number */}
              <div className={cn(
                "absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                isActive 
                  ? `bg-gradient-to-br ${step.color} text-white shadow-lg` 
                  : "bg-background/80 text-foreground-muted border border-border/50"
              )}>
                {index + 1}
              </div>

              {/* Animated gradient background */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500",
                step.color,
                isActive && "opacity-10"
              )} />

              {/* Icon with glow */}
              <div className={cn(
                "relative w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-500",
                `bg-gradient-to-br ${step.color}`,
                isActive && "shadow-lg scale-110"
              )}>
                <Icon className="h-7 w-7 text-white" />
                {isActive && (
                  <div className={cn(
                    "absolute inset-0 rounded-2xl bg-gradient-to-br animate-pulse blur-xl opacity-50",
                    step.color
                  )} />
                )}
              </div>

              {/* Content */}
              <h3 className={cn(
                "text-lg font-bold mb-2 transition-colors duration-300",
                isActive ? "text-foreground" : "text-foreground/80"
              )}>
                {step.title}
              </h3>
              <p className={cn(
                "text-sm leading-relaxed transition-colors duration-300",
                isActive ? "text-foreground-secondary" : "text-foreground-muted"
              )}>
                {step.description}
              </p>

              {/* Arrow connector (desktop) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:flex absolute -right-6 top-1/2 -translate-y-1/2 z-20">
                  <ArrowRight className={cn(
                    "h-5 w-5 transition-all duration-300",
                    isActive ? "text-primary scale-125" : "text-foreground-muted/50"
                  )} />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Final reveal info */}
      <Card className={cn(
        "max-w-2xl w-full p-6 md:p-8 relative overflow-hidden mb-10 transition-all duration-700 delay-400",
        "bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-md border-primary/20",
        isReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}>
        {/* Decorative corner */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-accent/20 to-primary/20 rounded-full blur-2xl" />
        
        <div className="flex items-start gap-5 relative z-10">
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <div className="absolute -inset-2 bg-gradient-to-br from-amber-500/30 to-orange-500/30 rounded-2xl blur-xl animate-pulse" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2 text-foreground">
              🎭 La Révélation Finale
            </h3>
            <p className="text-foreground-secondary leading-relaxed">
              À la fin du tour, tous les enregistrements sont révélés dans l'ordre ! 
              <span className="text-primary font-medium"> Comparez la phrase originale</span> avec toutes les interprétations successives. 
              Préparez-vous à rire !
            </p>
          </div>
        </div>
      </Card>

      {/* Player count and start */}
      <div className={cn(
        "flex flex-col items-center gap-5 relative z-10 transition-all duration-700 delay-500",
        isReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}>
        {/* Player count badge */}
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/30">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-foreground-muted uppercase tracking-wider">Joueurs prêts</p>
            <p className="text-xl font-bold text-foreground">{playerCount}</p>
          </div>
        </div>

        {isHost ? (
          <Button
            variant="hero"
            size="lg"
            onClick={handleStart}
            className="min-w-[220px] text-lg h-14 group relative overflow-hidden"
          >
            {/* Button glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative flex items-center gap-2">
              <Play className="h-5 w-5" />
              <span>Lancer la partie</span>
            </div>
          </Button>
        ) : (
          <Card className="p-5 bg-card/60 backdrop-blur-sm border-border/30 text-center">
            <div className="flex items-center gap-3 justify-center">
              <div className="relative">
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                <div className="absolute inset-0 w-3 h-3 rounded-full bg-primary animate-ping" />
              </div>
              <p className="text-foreground-secondary font-medium">
                En attente que l'hôte démarre la partie...
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
});

AudioPhoneInstructionsPhase.displayName = "AudioPhoneInstructionsPhase";
