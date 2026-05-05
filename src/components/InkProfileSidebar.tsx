import { memo, useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { User, Trophy, Gamepad2, Target, Flame, Edit2, Check, X, LogIn, LogOut, Gift, Award, Crown, Camera, Star, Zap } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { LevelProgressBar } from '@/components/LevelProgressBar';
import { RewardsPanel } from '@/components/RewardsPanel';
import { AchievementsPanel } from '@/components/AchievementsPanel';
import { TitleSelector } from '@/components/TitleSelector';
import { useEquippedTitle } from '@/hooks/useEquippedTitle';
import { useGlobalPlayerAvatar } from '@/hooks/useGlobalPlayerAvatar';
import { cn } from '@/lib/utils';
import { playInkSound } from '@/hooks/useInkSoundEffects';

const InkProfileSidebarComponent = () => {
  const { user, profile, stats, isLoading, signInWithGoogle, signOut, updateProfile } = useAuth();
  const { equippedTitle } = useEquippedTitle();
  const { avatarData, setAvatarImage, isLoading: avatarLoading } = useGlobalPlayerAvatar(user?.id || '');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showTitles, setShowTitles] = useState(false);
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
      toast.success('Pseudo mis à jour !');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Format non supporté. Utilisez JPG, PNG, GIF ou WebP');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 2 Mo");
      return;
    }

    setIsUploadingAvatar(true);
    playInkSound('brushTap', 0.4);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;
        await setAvatarImage(result);
        toast.success('Photo de profil mise à jour !');
        playInkSound('inkSuccess', 0.5);
        setIsUploadingAvatar(false);
      };
      reader.onerror = () => {
        toast.error('Impossible de charger l\'image');
        setIsUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Impossible de mettre à jour la photo');
      setIsUploadingAvatar(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const winRate = stats?.games_played && stats.games_played > 0
    ? Math.round((stats.games_won || 0) / stats.games_played * 100)
    : 0;

  // Non connecté
  if (!user && !isLoading) {
    return (
      <motion.div 
        className="w-full bg-card/80 backdrop-blur-sm border border-primary/30 rounded-xl overflow-hidden"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div className="px-3 py-2 border-b border-primary/20 bg-primary/5">
          <h2 className="text-lg font-bold text-primary flex items-center gap-2" style={{ fontFamily: "'Caveat', cursive" }}>
            <User className="h-5 w-5" />
            Mon Profil
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/30">
              <User className="h-10 w-10 text-primary/50" />
            </div>
            <p className="text-xs text-muted-foreground px-4 leading-relaxed">
              Connectez-vous pour sauvegarder votre progression
            </p>
            <motion.button
              onClick={() => {
                playInkSound('inkClick', 0.4);
                signInWithGoogle();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Connexion Google
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className="w-full bg-card/80 backdrop-blur-sm border border-border/30 rounded-xl overflow-hidden">
        <div className="px-3 py-2 border-b border-border/20">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-muted animate-pulse" />
            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted animate-pulse" />
          <div className="h-3 w-20 mx-auto bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const avatarImageUrl = avatarData.type === 'image' && avatarData.imageUrl 
    ? avatarData.imageUrl 
    : profile?.avatar_url || undefined;

  return (
    <>
      <motion.div 
        className="w-full bg-card/80 backdrop-blur-sm border border-primary/30 rounded-xl overflow-hidden flex flex-col"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-primary/20 bg-primary/5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary flex items-center gap-2" style={{ fontFamily: "'Caveat', cursive" }}>
            <User className="h-5 w-5" />
            Mon Profil
          </h2>
          <motion.button 
            onClick={() => {
              playInkSound('inkClick', 0.3);
              signOut();
            }} 
            whileHover={{ scale: 1.1 }}
            className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </motion.button>
        </div>

        <div className="p-4 space-y-4">
          {/* Avatar and name */}
          <div className="text-center space-y-3">
            {/* Avatar with upload button */}
            <div className="relative inline-block">
              <Avatar className="h-20 w-20 mx-auto ring-2 ring-primary/50 ring-offset-2 ring-offset-background">
                <AvatarImage src={avatarImageUrl} />
                <AvatarFallback 
                  className="text-white text-2xl font-bold bg-gradient-to-br from-primary to-primary/50"
                >
                  {profile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              {/* Camera button overlay */}
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
                className={cn(
                  "absolute -bottom-1 -right-1 w-8 h-8 rounded-full",
                  "bg-primary text-white flex items-center justify-center",
                  "hover:bg-primary/80 transition-colors shadow-lg",
                  "border-2 border-background"
                )}
              >
                {isUploadingAvatar ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </motion.button>
            </div>

            {/* Name */}
            {isEditing ? (
              <div className="flex items-center gap-1 px-2">
                <Input 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)} 
                  className="h-9 text-center text-sm bg-background/50 border-primary/50 focus:border-primary" 
                  placeholder="Votre pseudo" 
                  autoFocus 
                />
                <motion.button 
                  onClick={handleSave} 
                  disabled={isSaving} 
                  whileHover={{ scale: 1.1 }}
                  className="p-2 rounded hover:bg-green-500/20"
                >
                  <Check className="h-4 w-4 text-green-500" />
                </motion.button>
                <motion.button 
                  onClick={() => setIsEditing(false)} 
                  whileHover={{ scale: 1.1 }}
                  className="p-2 rounded hover:bg-red-500/20"
                >
                  <X className="h-4 w-4 text-red-500" />
                </motion.button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg text-foreground">{profile?.display_name || 'Joueur'}</span>
                  <motion.button 
                    onClick={() => {
                      playInkSound('inkClick', 0.3);
                      setIsEditing(true);
                    }} 
                    whileHover={{ scale: 1.1 }}
                    className="p-1 rounded hover:bg-muted"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </motion.button>
                </div>
                {/* Equipped title */}
                {equippedTitle && (
                  <span className={cn(
                    "text-xs px-3 py-1 rounded-full font-medium border",
                    equippedTitle.rarity === 'legendary' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' :
                    equippedTitle.rarity === 'epic' ? 'bg-purple-500/10 text-purple-500 border-purple-500/30' :
                    equippedTitle.rarity === 'rare' ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' :
                    'bg-muted text-muted-foreground border-border'
                  )}>
                    {equippedTitle.name}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Level Progress Bar */}
          <div className="bg-background/50 rounded-xl p-3 border border-primary/20">
            <LevelProgressBar />
          </div>

          {/* Win Rate */}
          <div className="bg-primary/10 rounded-xl p-4 text-center border border-primary/20">
            <div className="text-4xl font-black text-primary">{winRate}%</div>
            <div className="text-xs text-muted-foreground">Taux de victoire</div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            <InkStatCard icon={Gamepad2} label="Parties" value={stats?.games_played || 0} />
            <InkStatCard icon={Trophy} label="Victoires" value={stats?.games_won || 0} />
            <InkStatCard icon={Flame} label="Série" value={stats?.current_streak || 0} />
            <InkStatCard icon={Target} label="Meilleure" value={stats?.best_streak || 0} />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <InkActionButton 
              icon={Award} 
              label="Succès"
              onClick={() => {
                playInkSound('inkClick', 0.4);
                setShowAchievements(true);
              }} 
            />
            <InkActionButton 
              icon={Crown} 
              label="Titres"
              onClick={() => {
                playInkSound('inkClick', 0.4);
                setShowTitles(true);
              }} 
            />
            <InkActionButton 
              icon={Gift} 
              label="Récomp."
              onClick={() => {
                playInkSound('inkClick', 0.4);
                setShowRewards(true);
              }} 
            />
          </div>
        </div>
      </motion.div>

      <RewardsPanel isOpen={showRewards} onClose={() => setShowRewards(false)} />
      <AchievementsPanel isOpen={showAchievements} onClose={() => setShowAchievements(false)} />
      <TitleSelector isOpen={showTitles} onClose={() => setShowTitles(false)} />
    </>
  );
};

const InkStatCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: number }) => (
  <motion.div 
    className="bg-background/50 rounded-xl p-3 text-center border border-border/30 hover:border-primary/30 transition-colors"
    whileHover={{ scale: 1.02 }}
  >
    <Icon className="h-4 w-4 mx-auto mb-1 text-primary" />
    <div className="text-xl font-bold text-foreground">{value}</div>
    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
  </motion.div>
);

const InkActionButton = ({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) => (
  <motion.button
    onClick={onClick}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
  >
    <Icon className="h-4 w-4 text-primary" />
    <span className="text-[10px] text-muted-foreground">{label}</span>
  </motion.button>
);

export const InkProfileSidebar = memo(InkProfileSidebarComponent);
