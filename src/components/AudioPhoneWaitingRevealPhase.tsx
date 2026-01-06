import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Play, Sparkles, PartyPopper } from "lucide-react";

interface AudioPhoneWaitingRevealPhaseProps {
  isHost: boolean;
  onStartReveal: () => void;
}

export const AudioPhoneWaitingRevealPhase = ({
  isHost,
  onStartReveal,
}: AudioPhoneWaitingRevealPhaseProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-8 bg-gradient-to-br from-violet-950/80 to-fuchsia-950/80 border-violet-500/30 backdrop-blur-xl">
        <div className="text-center space-y-6">
          {/* Animated icons */}
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 flex items-center justify-center">
              <PartyPopper className="w-12 h-12 text-violet-400 animate-bounce" />
            </div>
            <Sparkles className="absolute top-0 right-0 w-6 h-6 text-yellow-400 animate-pulse" />
            <Sparkles className="absolute bottom-0 left-0 w-5 h-5 text-pink-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>

          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent mb-3">
              Toutes les imitations sont terminées !
            </h2>
            <p className="text-muted-foreground">
              {isHost 
                ? "Lance la révélation pour découvrir les résultats !" 
                : "En attente de l'hôte pour la révélation..."}
            </p>
          </div>

          {isHost ? (
            <Button
              onClick={onStartReveal}
              size="lg"
              className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 hover:from-violet-600 hover:via-fuchsia-600 hover:to-pink-600 shadow-lg shadow-violet-500/30 text-lg px-8 py-6"
            >
              <Play className="w-6 h-6 mr-3" />
              Lancer la révélation !
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
