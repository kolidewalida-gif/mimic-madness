import { memo, useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
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
  Gift,
  Award,
  Crown,
  Camera,
  Sparkles,
} from 'lucide-react';
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

const GRAFFITI_TEXT_SHADOW =
  '2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810, 1.5px 1.5px 0 #0a0810';

const GRAFFITI_TEXT_SHADOW_SM =
  '1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810, 1px 1px 0 #0a0810';

const InkProfileSidebarComponent = () => {
  const { user, profile, stats, isLoading, signInWithGoogle, signOut, updateProfile } =
    useAuth();
  const { equippedTitle } = useEquippedTitle();
  const { avatarData, setAvatarImage, isLoading: avatarLoading } = useGlobalPlayerAvatar(
    user?.id || '',
  );
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
    } catch {
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
        toast.error("Impossible de charger l'image");
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

  const winRate =
    stats?.games_played && stats.games_played > 0
      ? Math.round(((stats.games_won || 0) / stats.games_played) * 100)
      : 0;

  /* =========================================================
     NOT CONNECTED
  ========================================================= */
  if (!user && !isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full rounded-3xl overflow-hidden"
        style={{
          background:
            'linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0f0820 100%)',
          border: '4px solid #0a0810',
          boxShadow:
            '0 8px 0 #0a0810, 0 14px 30px rgba(168,85,247,0.35), inset 0 2px 0 rgba(255,255,255,0.08)',
        }}
      >
        <div
          className="absolute inset-1.5 rounded-[1.3rem] pointer-events-none"
          style={{ border: '2px solid rgba(168,85,247,0.4)' }}
        />
        <div className="relative p-6 text-center space-y-4">
          <motion.div
            animate={{ rotate: [-3, 3, -3] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-24 h-24 mx-auto rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #a855f7, #6b21a8)',
              border: '4px solid #0a0810',
              boxShadow:
                '0 5px 0 #0a0810, 0 10px 20px rgba(168,85,247,0.4), inset 0 2px 0 rgba(255,255,255,0.2)',
            }}
          >
            <User className="h-12 w-12 text-white" strokeWidth={2.5} />
          </motion.div>
          <p
            className="text-base text-white/80 font-bold leading-snug px-2"
            style={{ fontFamily: "'Caveat', cursive" }}
          >
            Connecte-toi pour sauvegarder ta progression !
          </p>
          <motion.button
            whileHover={{ scale: 1.04, rotate: -1.5 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              playInkSound('inkClick', 0.4);
              signInWithGoogle();
            }}
            className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-xl font-black text-white"
            style={{
              background: 'linear-gradient(180deg, #a855f7, #6b21a8)',
              border: '3px solid #0a0810',
              boxShadow: '0 5px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.2)',
              fontFamily: "'Caveat', cursive",
              textShadow: GRAFFITI_TEXT_SHADOW_SM,
            }}
          >
            <LogIn className="h-5 w-5" strokeWidth={2.5} />
            Connexion Google
          </motion.button>
        </div>
      </motion.div>
    );
  }

  /* =========================================================
     LOADING
  ========================================================= */
  if (isLoading) {
    return (
      <div
        className="w-full rounded-3xl overflow-hidden"
        style={{
          background:
            'linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0f0820 100%)',
          border: '4px solid #0a0810',
          boxShadow: '0 8px 0 #0a0810',
        }}
      >
        <div className="p-5 space-y-4 animate-pulse">
          <div className="w-24 h-24 mx-auto rounded-full bg-white/10" />
          <div className="h-5 w-32 mx-auto bg-white/10 rounded" />
          <div className="h-12 bg-white/10 rounded-2xl" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-16 bg-white/10 rounded-2xl" />
            <div className="h-16 bg-white/10 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const avatarImageUrl =
    avatarData.type === 'image' && avatarData.imageUrl
      ? avatarData.imageUrl
      : profile?.avatar_url || undefined;

  /* =========================================================
     CONNECTED — CARTOON PROFILE
  ========================================================= */
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full rounded-3xl overflow-hidden"
        style={{
          background:
            'linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0f0820 100%)',
          border: '4px solid #0a0810',
          boxShadow:
            '0 8px 0 #0a0810, 0 14px 30px rgba(168,85,247,0.35), inset 0 2px 0 rgba(255,255,255,0.08)',
        }}
      >
        {/* Inner accent border */}
        <div
          className="absolute inset-1.5 rounded-[1.3rem] pointer-events-none z-[1]"
          style={{ border: '2px solid rgba(168,85,247,0.4)' }}
        />

        {/* Decorative graffiti stars */}
        <Sparkles
          className="absolute top-3 right-3 w-4 h-4 text-amber-400 z-[2] select-none pointer-events-none"
          style={{ filter: 'drop-shadow(1px 1px 0 #0a0810)' }}
        />
        <Sparkles
          className="absolute bottom-4 left-4 w-3.5 h-3.5 text-pink-400 z-[2] select-none pointer-events-none"
          style={{ filter: 'drop-shadow(1px 1px 0 #0a0810)' }}
        />

        {/* Floating sign out button */}
        <motion.button
          whileHover={{ scale: 1.1, rotate: -8 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            playInkSound('inkClick', 0.3);
            signOut();
          }}
          className="absolute top-3 right-3 z-[3] w-9 h-9 rounded-xl flex items-center justify-center text-white"
          style={{
            background: 'rgba(239,68,68,0.25)',
            border: '2.5px solid #0a0810',
            boxShadow: '0 3px 0 #0a0810',
          }}
          title="Déconnexion"
        >
          <LogOut className="h-4 w-4" strokeWidth={2.5} />
        </motion.button>

        <div className="relative p-4 space-y-3 z-[2]">
          {/* AVATAR + NAME */}
          <div className="text-center space-y-2.5">
            <div className="relative inline-block">
              {/* Animated halo */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-2 rounded-full pointer-events-none"
                style={{
                  background:
                    'conic-gradient(from 0deg, #fbbf24, #f87171, #c084fc, #38bdf8, #34d399, #fbbf24)',
                  filter: 'blur(8px)',
                  opacity: 0.6,
                }}
              />
              <Avatar
                className="relative h-24 w-24 mx-auto"
                style={{
                  border: '4px solid #0a0810',
                  boxShadow:
                    '0 5px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.2)',
                }}
              >
                <AvatarImage src={avatarImageUrl} className="object-cover" />
                <AvatarFallback
                  className="text-3xl font-black text-white"
                  style={{
                    background: 'linear-gradient(135deg, #a855f7, #6b21a8)',
                    fontFamily: "'Caveat', cursive",
                  }}
                >
                  {profile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              {/* Camera button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <motion.button
                whileHover={{ scale: 1.15, rotate: -8 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  playInkSound('brushTap', 0.3);
                  fileInputRef.current?.click();
                }}
                disabled={isUploadingAvatar || avatarLoading}
                className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center"
                style={{
                  background:
                    'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)',
                  border: '3px solid #0a0810',
                  boxShadow: '0 3px 0 #0a0810, inset 0 1px 0 rgba(255,255,255,0.25)',
                }}
              >
                {isUploadingAvatar ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="h-4 w-4 text-white" strokeWidth={2.5} />
                )}
              </motion.button>
            </div>

            {/* Name */}
            {isEditing ? (
              <div className="flex items-center gap-2 px-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') setIsEditing(false);
                  }}
                  className="h-10 text-center text-xl font-black bg-black/40 text-white rounded-xl"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    border: '3px solid #0a0810',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
                  }}
                  placeholder="Pseudo"
                  autoFocus
                />
                <motion.button
                  whileHover={{ scale: 1.1, rotate: -5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background:
                      'linear-gradient(180deg, #34d399, #059669)',
                    border: '2.5px solid #0a0810',
                    boxShadow: '0 3px 0 #0a0810',
                  }}
                >
                  <Check className="h-4 w-4 text-white" strokeWidth={3} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsEditing(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'rgba(239,68,68,0.25)',
                    border: '2.5px solid #0a0810',
                    boxShadow: '0 3px 0 #0a0810',
                  }}
                >
                  <X className="h-4 w-4 text-white" strokeWidth={3} />
                </motion.button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="text-3xl font-black text-white leading-none"
                    style={{
                      fontFamily: "'Caveat', cursive",
                      textShadow: GRAFFITI_TEXT_SHADOW,
                    }}
                  >
                    {profile?.display_name || 'Joueur'}
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.15, rotate: 8 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      playInkSound('inkClick', 0.3);
                      setIsEditing(true);
                    }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '2px solid #0a0810',
                      boxShadow: '0 2px 0 #0a0810',
                    }}
                    title="Modifier le pseudo"
                  >
                    <Edit2 className="h-3 w-3 text-white/80" />
                  </motion.button>
                </div>

                {/* Equipped title — graffiti pill */}
                {equippedTitle && (
                  <motion.span
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: -1.5 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                    className="inline-block px-3 py-0.5 text-base font-black text-white"
                    style={{
                      background:
                        equippedTitle.rarity === 'legendary'
                          ? 'linear-gradient(180deg, #fbbf24, #d97706)'
                          : equippedTitle.rarity === 'epic'
                            ? 'linear-gradient(180deg, #a855f7, #7e22ce)'
                            : equippedTitle.rarity === 'rare'
                              ? 'linear-gradient(180deg, #38bdf8, #0369a1)'
                              : 'linear-gradient(180deg, #6b7280, #374151)',
                      border: '2.5px solid #0a0810',
                      borderRadius: '999px',
                      boxShadow: '0 3px 0 #0a0810',
                      fontFamily: "'Caveat', cursive",
                      textShadow: GRAFFITI_TEXT_SHADOW_SM,
                    }}
                  >
                    {equippedTitle.name}
                  </motion.span>
                )}
              </div>
            )}
          </div>

          {/* LEVEL PROGRESS BAR — wrapped with cartoon frame */}
          <div
            className="rounded-2xl p-3"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
              border: '3px solid #0a0810',
              boxShadow: '0 3px 0 #0a0810',
            }}
          >
            <LevelProgressBar />
          </div>

          {/* WIN RATE — big cartoon callout */}
          <motion.div
            whileHover={{ scale: 1.02, rotate: -0.5 }}
            className="relative rounded-2xl p-4 text-center overflow-hidden"
            style={{
              background:
                'linear-gradient(180deg, rgba(239,68,68,0.18), rgba(127,29,29,0.18))',
              border: '3px solid #0a0810',
              boxShadow: '0 4px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.08)',
            }}
          >
            {/* Glow halo */}
            <div
              className="absolute inset-0 pointer-events-none opacity-50"
              style={{
                background:
                  'radial-gradient(circle at center, rgba(248,113,113,0.3), transparent 65%)',
              }}
            />
            <div
              className="relative text-5xl font-black leading-none"
              style={{
                color: '#f87171',
                fontFamily: "'Caveat', cursive",
                textShadow:
                  '3px 3px 0 #0a0810, -2px -2px 0 #0a0810, 2px -2px 0 #0a0810, -2px 2px 0 #0a0810, 2px 2px 0 #0a0810',
              }}
            >
              {winRate}%
            </div>
            <div
              className="relative text-xs uppercase tracking-wider font-black text-white/70 mt-1"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              Taux de victoire
            </div>
          </motion.div>

          {/* STATS GRID */}
          <div className="grid grid-cols-2 gap-2.5">
            <InkStatCard
              icon={Gamepad2}
              label="Parties"
              value={stats?.games_played || 0}
              color="#a855f7"
              glow="#c084fc"
              tilt={-1}
            />
            <InkStatCard
              icon={Trophy}
              label="Victoires"
              value={stats?.games_won || 0}
              color="#fbbf24"
              glow="#fde047"
              tilt={1}
            />
            <InkStatCard
              icon={Flame}
              label="Série"
              value={stats?.current_streak || 0}
              color="#ef4444"
              glow="#f87171"
              tilt={1}
            />
            <InkStatCard
              icon={Target}
              label="Meilleure"
              value={stats?.best_streak || 0}
              color="#34d399"
              glow="#6ee7b7"
              tilt={-1}
            />
          </div>

          {/* ACTION BUTTONS — graffiti tabs */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <InkActionButton
              icon={Award}
              label="Succès"
              color="#fbbf24"
              onClick={() => {
                playInkSound('inkClick', 0.4);
                setShowAchievements(true);
              }}
            />
            <InkActionButton
              icon={Crown}
              label="Titres"
              color="#a855f7"
              onClick={() => {
                playInkSound('inkClick', 0.4);
                setShowTitles(true);
              }}
            />
            <InkActionButton
              icon={Gift}
              label="Récomp."
              color="#ef4444"
              onClick={() => {
                playInkSound('inkClick', 0.4);
                setShowRewards(true);
              }}
            />
          </div>
        </div>
      </motion.div>

      <RewardsPanel isOpen={showRewards} onClose={() => setShowRewards(false)} />
      <AchievementsPanel
        isOpen={showAchievements}
        onClose={() => setShowAchievements(false)}
      />
      <TitleSelector isOpen={showTitles} onClose={() => setShowTitles(false)} />
    </>
  );
};

/* ============================================================
   STAT CARD — cartoon graffiti
============================================================ */
const InkStatCard = ({
  icon: Icon,
  label,
  value,
  color,
  glow,
  tilt = 0,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
  glow: string;
  tilt?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.85, rotate: tilt * 2 }}
    animate={{ opacity: 1, scale: 1, rotate: tilt * 0.5 }}
    whileHover={{ y: -3, scale: 1.04, rotate: 0 }}
    transition={{ type: 'spring', stiffness: 280, damping: 20 }}
    className="relative rounded-2xl py-3 px-2 text-center overflow-hidden"
    style={{
      background:
        'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01))',
      border: '3px solid #0a0810',
      boxShadow: `0 4px 0 #0a0810`,
    }}
  >
    {/* Subtle color halo */}
    <div
      className="absolute inset-0 pointer-events-none opacity-25"
      style={{
        background: `radial-gradient(circle at top, ${glow}55, transparent 70%)`,
      }}
    />
    <div
      className="relative w-7 h-7 mx-auto mb-1.5 rounded-lg flex items-center justify-center"
      style={{
        background: `linear-gradient(180deg, ${color}, ${color}aa)`,
        border: '2px solid #0a0810',
        boxShadow: '0 2px 0 #0a0810',
      }}
    >
      <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
    </div>
    <div
      className="relative text-2xl font-black text-white leading-none"
      style={{
        fontFamily: "'Caveat', cursive",
        textShadow: GRAFFITI_TEXT_SHADOW_SM,
      }}
    >
      {value}
    </div>
    <div
      className="relative text-[10px] uppercase tracking-wider font-black text-white/55 mt-0.5"
      style={{ fontFamily: "'Caveat', cursive" }}
    >
      {label}
    </div>
  </motion.div>
);

/* ============================================================
   ACTION BUTTON — colored graffiti tab
============================================================ */
const InkActionButton = ({
  icon: Icon,
  label,
  color,
  onClick,
}: {
  icon: any;
  label: string;
  color: string;
  onClick: () => void;
}) => (
  <motion.button
    onClick={onClick}
    whileHover={{ y: -3, scale: 1.05, rotate: -2 }}
    whileTap={{ scale: 0.95 }}
    className="relative flex flex-col items-center gap-1 py-3 px-2 rounded-2xl overflow-hidden"
    style={{
      background: `linear-gradient(180deg, ${color}33, ${color}10)`,
      border: '3px solid #0a0810',
      boxShadow: '0 4px 0 #0a0810',
    }}
  >
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center"
      style={{
        background: `linear-gradient(180deg, ${color}, ${color}cc)`,
        border: '2px solid #0a0810',
        boxShadow: '0 2px 0 #0a0810',
      }}
    >
      <Icon className="h-4 w-4 text-white" strokeWidth={2.5} />
    </div>
    <span
      className="text-sm font-black text-white leading-none"
      style={{
        fontFamily: "'Caveat', cursive",
        textShadow: GRAFFITI_TEXT_SHADOW_SM,
      }}
    >
      {label}
    </span>
  </motion.button>
);

export const InkProfileSidebar = memo(InkProfileSidebarComponent);
