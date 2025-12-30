import { memo } from "react";
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
  Volume2
} from "lucide-react";

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
  const steps = [
    {
      icon: Mic,
      title: "Enregistrez",
      description: "Le premier joueur enregistre une phrase de son choix",
      color: "from-emerald-500 to-teal-500",
    },
    {
      icon: RotateCcw,
      title: "Inversion",
      description: "L'audio est automatiquement inversé (joué à l'envers)",
      color: "from-violet-500 to-purple-500",
    },
    {
      icon: Headphones,
      title: "Écoutez",
      description: "Le joueur suivant écoute l'audio inversé mystérieux",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: MessageSquare,
      title: "Reproduisez",
      description: "Il doit répéter ce qu'il croit avoir compris",
      color: "from-orange-500 to-amber-500",
    },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center">
      {/* Header */}
      <div className="text-center mb-8 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 mb-4">
          <Volume2 className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-sm font-medium text-primary">Nouveau Mode</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-black mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
          Audio Phone
        </h1>
        
        <p className="text-lg text-foreground-secondary max-w-md mx-auto">
          Le téléphone arabe version audio inversé ! 
          Saurez-vous décoder le message ?
        </p>
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl w-full mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <Card 
              key={step.title}
              className="relative p-6 bg-card/60 backdrop-blur-sm border-border/30 overflow-hidden group hover:scale-[1.02] transition-transform duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Step number */}
              <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center border border-border/50">
                <span className="text-sm font-bold text-foreground-muted">{index + 1}</span>
              </div>

              {/* Gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4 shadow-lg`}>
                <Icon className="h-7 w-7 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold mb-2 text-foreground">
                {step.title}
              </h3>
              <p className="text-sm text-foreground-secondary leading-relaxed">
                {step.description}
              </p>

              {/* Arrow connector */}
              {index < steps.length - 1 && (
                <div className="hidden lg:flex absolute -right-6 top-1/2 -translate-y-1/2 z-10">
                  <ArrowRight className="h-5 w-5 text-foreground-muted" />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Final reveal info */}
      <Card className="max-w-2xl w-full p-6 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border-primary/20 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold mb-1 text-foreground">
              La Révélation Finale
            </h3>
            <p className="text-sm text-foreground-secondary">
              À la fin du tour, tous les enregistrements sont révélés dans l'ordre ! 
              Comparez la phrase originale avec toutes les interprétations successives. 
              Préparez-vous à rire !
            </p>
          </div>
        </div>
      </Card>

      {/* Player count and start */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 text-foreground-secondary">
          <Users className="h-5 w-5" />
          <span className="font-medium">{playerCount} joueurs prêts</span>
        </div>

        {isHost ? (
          <Button
            variant="hero"
            size="lg"
            onClick={onStart}
            className="min-w-[200px] text-lg"
          >
            <Mic className="h-5 w-5 mr-2" />
            Commencer
          </Button>
        ) : (
          <div className="text-center p-4 rounded-xl bg-background/50 border border-border/30">
            <p className="text-foreground-secondary">
              En attente que l'hôte démarre la partie...
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

AudioPhoneInstructionsPhase.displayName = "AudioPhoneInstructionsPhase";
