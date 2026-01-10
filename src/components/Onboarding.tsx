import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Gamepad2, Users, Mic, Trophy, Sparkles, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  image?: string;
  color: string;
}

const steps: OnboardingStep[] = [
  {
    icon: <Sparkles className="h-12 w-12" />,
    title: "Bienvenue sur MimicMaster!",
    description: "Le jeu de party ultime pour des soirées inoubliables entre amis. Préparez-vous à rire, imiter et vous amuser!",
    color: "from-primary to-primary-light"
  },
  {
    icon: <Users className="h-12 w-12" />,
    title: "Créez ou rejoignez un salon",
    description: "Créez un salon privé avec un code unique ou rejoignez vos amis en entrant leur code. Jusqu'à 10 joueurs peuvent participer!",
    color: "from-accent to-blue-500"
  },
  {
    icon: <Gamepad2 className="h-12 w-12" />,
    title: "Choisissez votre mode de jeu",
    description: "Audio Phone inversé pour des imitations hilarantes, Quiz multijoueur pour tester vos connaissances, et bien plus encore!",
    color: "from-green-500 to-emerald-400"
  },
  {
    icon: <Mic className="h-12 w-12" />,
    title: "Audio Phone - Le téléphone arabe audio",
    description: "Enregistrez une phrase, elle sera inversée! Les autres joueurs doivent l'imiter à l'oreille. Fous rires garantis lors de la révélation!",
    color: "from-purple-500 to-pink-500"
  },
  {
    icon: <Volume2 className="h-12 w-12" />,
    title: "Autorisez le microphone",
    description: "Pour participer aux jeux audio, assurez-vous d'autoriser l'accès au microphone. Vous pouvez tester votre micro dans les paramètres.",
    color: "from-orange-500 to-amber-400"
  },
  {
    icon: <Trophy className="h-12 w-12" />,
    title: "Gagnez des badges!",
    description: "Débloquez des badges en jouant: premier message, première victoire, série de bonnes réponses... Collectionnez-les tous!",
    color: "from-yellow-500 to-orange-400"
  }
];

interface OnboardingProps {
  onComplete: () => void;
  isOpen: boolean;
}

export const Onboarding = ({ onComplete, isOpen }: OnboardingProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      playSoundEffect('transitionMagic', 0.4);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      playSoundEffect('tabSwitch', 0.4);
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      playSoundEffect('tabSwitch', 0.4);
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    playSoundEffect('success', 0.5);
    localStorage.setItem('mimic-master-onboarded', 'true');
    onComplete();
  };

  const handleSkip = () => {
    playSoundEffect('click', 0.3);
    handleComplete();
  };

  if (!isOpen) return null;

  const step = steps[currentStep];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-background/95 backdrop-blur-xl"
      >
        {/* Background gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className={cn("absolute w-96 h-96 rounded-full blur-3xl opacity-30 bg-gradient-to-br", step.color)}
            animate={{
              x: [0, 50, 0],
              y: [0, -30, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            style={{ top: '10%', left: '20%' }}
          />
          <motion.div
            className={cn("absolute w-80 h-80 rounded-full blur-3xl opacity-20 bg-gradient-to-br", step.color)}
            animate={{
              x: [0, -40, 0],
              y: [0, 40, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            style={{ bottom: '10%', right: '20%' }}
          />
        </div>

        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="relative max-w-lg w-full mx-4 glass-card p-8"
        >
          {/* Skip button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Icon */}
          <div className={cn(
            "w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center",
            "bg-gradient-to-br text-white shadow-lg",
            step.color
          )}>
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              {step.icon}
            </motion.div>
          </div>

          {/* Content */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-display font-bold text-center mb-4"
          >
            {step.title}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-center mb-8 leading-relaxed"
          >
            {step.description}
          </motion.p>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  playSoundEffect('click', 0.3);
                  setCurrentStep(index);
                }}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  index === currentStep 
                    ? "w-8 bg-primary" 
                    : index < currentStep 
                      ? "bg-primary/50" 
                      : "bg-muted"
                )}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={handlePrev}
                className="flex-1"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Précédent
              </Button>
            )}
            <Button
              onClick={handleNext}
              className={cn(
                "flex-1 bg-gradient-to-r text-white",
                step.color
              )}
            >
              {currentStep === steps.length - 1 ? "C'est parti!" : "Suivant"}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
