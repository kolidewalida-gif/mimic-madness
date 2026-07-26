import { useState, useRef } from 'react';
import { GameCard } from '@/components/GameCard';
import { Button } from '@/components/ui/button';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { useGlobalPlayerAvatar } from '@/hooks/useGlobalPlayerAvatar';
import { Upload, Trash2, Palette, Image, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AvatarSettingsProps {
  playerId: string;
  playerName: string;
  onClose?: () => void;
}

export const AvatarSettings = ({ playerId, playerName, onClose }: AvatarSettingsProps) => {
  const { avatarData, isLoading, setAvatarImage, setAvatarColor, clearAvatar, DEFAULT_COLORS } = useGlobalPlayerAvatar(playerId);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Format non supporté",
        description: "Utilisez une image JPG, PNG, GIF ou WebP",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB for base64 storage)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "L'image ne doit pas dépasser 2 Mo",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Convert to base64 for database storage
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;
        await setAvatarImage(result);
        
        toast({
          title: "Avatar mis à jour !",
          description: "Votre avatar est sauvegardé définitivement",
        });
        setIsUploading(false);
      };
      reader.onerror = () => {
        toast({
          title: "Erreur",
          description: "Impossible de charger l'image",
          variant: "destructive",
        });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'avatar",
        variant: "destructive",
      });
      setIsUploading(false);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleColorSelect = async (color: string) => {
    await setAvatarColor(color);
    toast({
      title: "Couleur changée !",
      description: "Votre avatar a été mis à jour",
    });
  };

  const handleClearAvatar = async () => {
    await clearAvatar();
    toast({
      title: "Avatar réinitialisé",
      description: "Votre avatar a été remis par défaut",
    });
  };

  return (
    <GameCard className="relative">
      {onClose && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Fermer la personnalisation de l'avatar"
          className="menu-icon-control menu-focus absolute top-4 right-4"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
      
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Image className="h-5 w-5 text-secondary" />
          <h3 className="text-xl font-display font-semibold text-gradient">
            Personnaliser l'Avatar
          </h3>
        </div>

        {/* Current Avatar Preview */}
        <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-background-secondary/50 border border-glass-border">
          <PlayerAvatar
            playerId={playerId}
            playerName={playerName}
            size="xl"
            animated
          />
          <p className="font-display text-foreground">{playerName}</p>
          <p className="text-xs text-foreground-muted text-center">
            Votre avatar est sauvegardé définitivement
          </p>
        </div>

        {/* Upload Image */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground-secondary flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Image personnalisée
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="menu-focus w-full"
            disabled={isUploading || isLoading}
            aria-busy={isUploading}
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent mr-2" />
                Chargement...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
                Choisir une image ou un GIF
              </>
            )}
          </Button>
          <p className="text-xs text-foreground-muted">
            JPG, PNG, GIF ou WebP • Max 2 Mo
          </p>
        </div>

        {/* Color Selection */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground-secondary flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Couleur de fond
          </p>
          <div className="grid grid-cols-4 gap-2">
            {DEFAULT_COLORS.map((color, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleColorSelect(color)}
                disabled={isLoading}
                aria-label={`Choisir la couleur de fond ${color}`}
                aria-pressed={avatarData.backgroundColor === color}
                className={`menu-focus w-full aspect-square rounded-xl transition-all hover:scale-110 hover:ring-2 hover:ring-white/50 ${
                  avatarData.backgroundColor === color ? 'ring-2 ring-white scale-110' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Reset Button */}
        {(avatarData.type === 'image' || avatarData.backgroundColor) && (
          <Button
            type="button"
            onClick={handleClearAvatar}
            variant="ghost"
            className="menu-focus w-full text-foreground-muted hover:text-destructive"
            disabled={isLoading}
          >
            <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
            Réinitialiser l'avatar
          </Button>
        )}
      </div>
    </GameCard>
  );
};