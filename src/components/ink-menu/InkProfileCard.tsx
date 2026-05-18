import { memo, useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEquippedTitle } from '@/hooks/useEquippedTitle';
import { useGlobalPlayerAvatar } from '@/hooks/useGlobalPlayerAvatar';
import { motion } from 'framer-motion';
import {
  User,
  Trophy,
  Gamepad2,
  Target,
  Flame,
  Edit2,
  Check,
  X,
  LogIn,
  LogOut,
  Camera,
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { LevelProgressBar } from '@/components/LevelProgressBar';
import { cn } from '@/lib/utils';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { toast } from 'sonner';

const InkProfileCardComponent = () => {
  const { user, profile, stats, isLoading, signInWithGoogle, signOut, updateProfile } =
    useAuth();
  const { equippedTitle } = useEquippedTitle();
  const { avatarData, setAvatarImage, isLoading: avatarLoading } =
    useGlobalPlayerAvatar(user?.id || '');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.display_name) {
      setEditName(profile.display_name);
    }
  }, [profile?.display_name]);

  const handleSave = async () => {
    if (!editName.trim()) return;
    setIsSaving(true);
    playInkSound('inkSuccess', 0.4);
    try {
      await updateProfile({ display_name: editName.trim() });
      setIsEditing(false);
      toast.success('Pseudo mis a jour !');
    } catch {
      toast.error('Erreur lors de la mise a jour');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Format non supporte. Utilisez JPG, PNG, GIF ou WebP');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image ne doit pas depasser 2 Mo");
      return;
    }

    setIsUploadingAvatar(true);
    playInkSound('brushTap', 0.4);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;
        await setAvatarImage(result);
        toast.success('Photo de profil mise a jour !');
        playInkSound('inkSuccess', 0.5);
        setIsUploadingAvatar(false);
      };
      reader.onerror = () => {
        toast.error("Impossible de charger l'image");
        setIsUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Impossible de mettre a jour la photo');
      setIsUploadingAvatar(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const winRate =
    stats?.games_played && stats.games_played > 0
      ? Math.round(((stats.games_won || 0) / stats.games_played) * 100)
      : 0;

  if (isLoading) {
    return (
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="w-16 h-16 mx-auto rounded-full bg-white/5 animate-pulse" />
        <div className="h-3 w-20 mx-auto bg-white/5 rounded animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/30">
            <User className="h-8 w-8 text-red-500/50" />
          </div>
          <p className="text-xs text-white/50">
            Connectez-vous pour sauvegarder votre progression
          </p>
          <motion.button
            onClick={() => {
              playInkSound('inkClick', 0.4);
              signInWithGoogle();
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            aria-label="Se connecter avec Google"
            className="w-full py-3 px-4 bg-red-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-red-500/90 transition-colors"
          >
            <LogIn className="h-4 w-4" />
            Connexion Google
          </motion.button>
        </div>
      </div>
    );
  }

  const avatarImageUrl =
    avatarData.type === 'image' && avatarData.imageUrl
      ? avatarData.imageUrl
      : profile?.avatar_url || undefined;

  return (
    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 space-y-4">
      {/* Avatar and Name */}
      <div className="text-center space-y-2">
        <div className="relative inline-block">
          <motion.div
            animate={{ rotateY: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            whileHover={{ rotateX: 10 }}
            style={{ perspective: 600 }}
          >
            <Avatar className="h-16 w-16 mx-auto ring-2 ring-red-500/50 ring-offset-2 ring-offset-black">
              <AvatarImage src={avatarImageUrl} />
              <AvatarFallback className="text-white text-xl font-bold bg-gradient-to-br from-red-500 to-red-900">
                {profile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </motion.div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleAvatarUpload}
            className="hidden"
          />
          <motion.button
            onClick={() => {
              playInkSound('brushTap', 0.3);
              fileInputRef.current?.click();
            }}
            disabled={isUploadingAvatar || avatarLoading}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Changer la photo de profil"
            className={cn(
              'absolute -bottom-1 -right-1 w-7 h-7 rounded-full',
              'bg-red-500 text-white flex items-center justify-center',
              'hover:bg-red-500/80 transition-colors shadow-lg',
              'border-2 border-black',
            )}
          >
            {isUploadingAvatar ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="h-3 w-3" />
            )}
          </motion.button>
        </div>

        {/* Name */}
        {isEditing ? (
          <div className="flex items-center gap-1 px-1">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-8 text-center text-sm bg-white/5 border-red-500/50 focus:border-red-500 text-white"
              placeholder="Votre pseudo"
              autoFocus
            />
            <motion.button
              onClick={handleSave}
              disabled={isSaving}
              whileHover={{ scale: 1.1 }}
              aria-label="Confirmer le pseudo"
              className="p-1.5 rounded hover:bg-green-500/20"
            >
              <Check className="h-3.5 w-3.5 text-green-500" />
            </motion.button>
            <motion.button
              onClick={() => setIsEditing(false)}
              whileHover={{ scale: 1.1 }}
              aria-label="Annuler"
              className="p-1.5 rounded hover:bg-red-500/20"
            >
              <X className="h-3.5 w-3.5 text-red-500" />
            </motion.button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-white">
                {profile?.display_name || 'Joueur'}
              </span>
              <motion.button
                onClick={() => {
                  playInkSound('inkClick', 0.3);
                  setIsEditing(true);
                }}
                whileHover={{ scale: 1.1 }}
                aria-label="Modifier le pseudo"
                className="p-1 rounded hover:bg-white/10"
              >
                <Edit2 className="h-3 w-3 text-white/50" />
              </motion.button>
            </div>
            {equippedTitle && (
              <span
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-medium border',
                  equippedTitle.rarity === 'legendary'
                    ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                    : equippedTitle.rarity === 'epic'
                      ? 'bg-purple-500/10 text-purple-500 border-purple-500/30'
                      : equippedTitle.rarity === 'rare'
                        ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                        : 'bg-white/5 text-white/50 border-white/20',
                )}
              >
                {equippedTitle.name}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Level Progress */}
      <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
        <LevelProgressBar />
      </div>

      {/* Win Rate */}
      <div className="bg-red-500/10 rounded-xl p-3 text-center border border-red-500/20">
        <div
          className="text-3xl font-black text-red-500"
          style={{ textShadow: '0 0 20px rgba(255,43,43,0.4)' }}
        >
          {winRate}%
        </div>
        <div className="text-[10px] text-white/50">Taux de victoire</div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatItem icon={Gamepad2} label="Parties" value={stats?.games_played || 0} />
        <StatItem icon={Trophy} label="Victoires" value={stats?.games_won || 0} />
        <StatItem icon={Flame} label="Serie" value={stats?.current_streak || 0} />
        <StatItem icon={Target} label="Meilleure" value={stats?.best_streak || 0} />
      </div>

      {/* Sign out */}
      <motion.button
        onClick={() => {
          playInkSound('inkClick', 0.3);
          signOut();
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        aria-label="Se deconnecter"
        className="w-full flex items-center justify-center gap-2 py-2 text-white/40 hover:text-red-400 transition-colors text-xs"
      >
        <LogOut className="h-3.5 w-3.5" />
        Deconnexion
      </motion.button>
    </div>
  );
};

const StatItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) => (
  <div className="bg-white/5 rounded-lg p-2 text-center border border-white/5 hover:border-red-500/20 transition-colors">
    <Icon className="h-3.5 w-3.5 mx-auto mb-0.5 text-red-500" />
    <div className="text-lg font-bold text-white">{value}</div>
    <div className="text-[9px] text-white/40 uppercase tracking-wider">{label}</div>
  </div>
);

export const InkProfileCard = memo(InkProfileCardComponent);
