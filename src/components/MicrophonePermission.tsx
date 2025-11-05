import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, AlertCircle } from "lucide-react";

interface MicrophonePermissionProps {
  onPermissionGranted: () => void;
}

export const MicrophonePermission = ({ onPermissionGranted }: MicrophonePermissionProps) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermission = async () => {
    setIsRequesting(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: false
      });
      
      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      onPermissionGranted();
    } catch (err: any) {
      console.error('Error requesting microphone permission:', err);
      
      if (err.name === 'NotAllowedError') {
        setError("Permission refusée. Veuillez autoriser l'accès au microphone dans les paramètres de votre navigateur.");
      } else if (err.name === 'NotFoundError') {
        setError("Aucun microphone détecté sur cet appareil.");
      } else {
        setError("Impossible d'accéder au microphone. Vérifiez vos paramètres.");
      }
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <Card className="p-6 bg-background-secondary/50 border-glass-border">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center">
            <Mic className="h-8 w-8 text-secondary" />
          </div>
        </div>
        
        <div>
          <h3 className="text-xl font-semibold mb-2">Autorisation Microphone</h3>
          <p className="text-foreground-secondary text-sm">
            Cette application a besoin d'accéder à votre microphone pour enregistrer vos imitations.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive text-left">{error}</p>
          </div>
        )}

        <Button
          variant="hero"
          size="lg"
          onClick={requestPermission}
          disabled={isRequesting}
          className="w-full"
        >
          <Mic className="h-5 w-5 mr-2" />
          {isRequesting ? "Demande en cours..." : "Autoriser le Microphone"}
        </Button>

        <p className="text-xs text-foreground-secondary">
          💡 Astuce : Si vous avez bloqué l'accès, cliquez sur l'icône 🔒 dans la barre d'adresse
        </p>
      </div>
    </Card>
  );
};