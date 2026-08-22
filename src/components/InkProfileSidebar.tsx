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
  Camera,
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { LevelProgressBar } from '@/components/LevelProgressBar';
import { useEquippedTitle } from '@/hooks/useEquippedTitle';
import { rarityStyle } from '@/lib/rarity';
import { useGlobalPlayerAvatar } from '@/hooks/useGlobalPlayerAvatar';
import { cn } from '@/lib/utils';
import { playInkSound } from '@/hooks/useInkSoundEffects';

const GRAFFITI_TEXT_SHADOW =
  'none';

const GRAFFITI_TEXT_SHADOW_SM =
  'none';

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
          border: '1px solid var(--ink-line)',
          boxShadow:
            'none',
        }}
      >
        <div
          className="absolute inset-1.5 rounded-[1.3rem] pointer-events-none"
          style={{ border: '2px solid var(--ink-accent-soft)' }}
        />
        <div className="relative p-6 text-center space-y-4">
          <motion.div
            animate={{ rotate: [-3, 3, -3] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-24 h-24 mx-auto rounded-full flex items-center justify-center"
            style={{
              background: 'var(--ink-accent)',
              border: '1px solid var(--ink-line)',
              boxShadow:
                'none',
            }}
          >
            <User className="h-12 w-12 text-white" strokeWidth={2.5} />
          </motion.div>
          <p
            className="text-base text-white/80 font-bold leading-snug px-2"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Connecte-toi pour sauvegarder ta progression !
          </p>
          <motion.button
            type="button"
            whileHover={{ scale: 1.04, rotate: -1.5 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              playInkSound('inkClick', 0.4);
              signInWithGoogle();
            }}
            className="menu-focus w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-xl font-black text-white"
            style={{
              background: 'var(--ink-accent)',
              border: '1px solid var(--ink-line)',
              boxShadow: 'none',
              fontFamily: "'Outfit', sans-serif",
              textShadow: GRAFFITI_TEXT_SHADOW_SM,
            }}
          >
            <LogIn className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
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
          border: '1px solid var(--ink-line)',
          boxShadow: 'none',
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
      {/*
        Surface partagée au lieu du dégradé en dur `#1a0d2e → #0f0820`, plus
        sombre que `--ink-surface-2` : ce panneau ressortait comme un corps
        étranger au milieu des autres menus du tiroir.

        Sont également retirés la bordure d'accent interne et les deux étoiles
        décoratives. L'une des deux se superposait exactement au bouton de
        déconnexion : toutes deux étaient posées en `top-3 right-3`, l'étoile en
        `z-[2]` sous un bouton en `z-[3]`.
      */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="ink-section relative w-full overflow-hidden"
      >
        {/* `.ink-section` fournit déjà le rembourrage : le `p-4` qui était ici
            le doublait. */}
        <div className="relative space-y-3 z-[2]">
          {/* AVATAR + NAME */}
          <div className="text-center space-y-2.5">
            <div className="relative inline-block">
              {/*
                Halo fixe. Il tournait en boucle (`rotate: 360`, `repeat:
                Infinity`) : un dégradé conique flouté repeint sans fin derrière
                l'avatar, à l'encontre de la règle « pas d'animation infinie » de
                la coquille partagée, et pour un effet que l'immobilité rend tout
                aussi lisible.
              */}
              <div
                className="absolute -inset-2 rounded-full pointer-events-none"
                style={{
                  background:
                    'conic-gradient(from 0deg, #fbbf24, #f87171, var(--ink-accent), #38bdf8, #34d399, #fbbf24)',
                  filter: 'blur(8px)',
                  opacity: 0.6,
                }}
              />
              <Avatar
                className="relative h-24 w-24 mx-auto"
                style={{
                  border: '1px solid var(--ink-line)',
                  boxShadow:
                    'none',
                }}
              >
                <AvatarImage src={avatarImageUrl} className="object-cover" />
                <AvatarFallback
                  className="text-3xl font-black text-white"
                  style={{
                    background: 'var(--ink-accent)',
                    fontFamily: "'Outfit', sans-serif",
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
                type="button"
                whileHover={{ scale: 1.15, rotate: -8 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  playInkSound('brushTap', 0.3);
                  fileInputRef.current?.click();
                }}
                disabled={isUploadingAvatar || avatarLoading}
                aria-label="Changer la photo de profil"
                aria-busy={isUploadingAvatar}
                className="menu-icon-control menu-focus absolute -bottom-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center"
                style={{
                  background:
                    'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)',
                  border: '1px solid var(--ink-line)',
                  boxShadow: 'none',
                }}
              >
                {isUploadingAvatar ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="h-4 w-4 text-white" strokeWidth={2.5} aria-hidden="true" />
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
                    fontFamily: "'Outfit', sans-serif",
                    border: '1px solid var(--ink-line)',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
                  }}
                  placeholder="Pseudo"
                  autoFocus
                />
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.1, rotate: -5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSave}
                  disabled={isSaving}
                  aria-label="Enregistrer le pseudo"
                  aria-busy={isSaving}
                  className="menu-icon-control menu-focus w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background:
                      'linear-gradient(180deg, #34d399, #059669)',
                    border: '1px solid var(--ink-line)',
                    boxShadow: 'none',
                  }}
                >
                  <Check className="h-4 w-4 text-white" strokeWidth={3} aria-hidden="true" />
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsEditing(false)}
                  aria-label="Annuler la modification du pseudo"
                  className="menu-icon-control menu-focus w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'rgba(239,68,68,0.25)',
                    border: '1px solid var(--ink-line)',
                    boxShadow: 'none',
                  }}
                >
                  <X className="h-4 w-4 text-white" strokeWidth={3} aria-hidden="true" />
                </motion.button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="text-3xl font-black text-white leading-none"
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      textShadow: GRAFFITI_TEXT_SHADOW,
                    }}
                  >
                    {profile?.display_name || 'Joueur'}
                  </span>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.15, rotate: 8 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      playInkSound('inkClick', 0.3);
                      setIsEditing(true);
                    }}
                    aria-label="Modifier le pseudo"
                    className="menu-icon-control menu-focus w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid var(--ink-line)',
                      boxShadow: 'none',
                    }}
                    title="Modifier le pseudo"
                  >
                    <Edit2 className="h-3 w-3 text-white/80" aria-hidden="true" />
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
                      /*
                       * `rarityStyle` est la table partagée, déjà utilisée par
                       * les panneaux Titres, Succès et Récompenses. Ce composant
                       * en redéfinissait une quatrième version en dur, qui
                       * pouvait donc dériver des trois autres.
                       *
                       * On lit `color` et non `gradient` : ce dernier contient
                       * des classes Tailwind, pas une valeur CSS.
                       */
                      background: rarityStyle(equippedTitle.rarity).color,
                      border: '1px solid var(--ink-line)',
                      borderRadius: '999px',
                      boxShadow: 'none',
                      fontFamily: 'var(--ink-font-body)',
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
              border: '1px solid var(--ink-line)',
              boxShadow: 'none',
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
              border: '1px solid var(--ink-line)',
              boxShadow: 'none',
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
                fontFamily: "'Outfit', sans-serif",
                textShadow:
                  'none',
              }}
            >
              {winRate}%
            </div>
            <div
              className="relative text-xs uppercase tracking-wider font-black text-white/70 mt-1"
              style={{ fontFamily: "'Outfit', sans-serif" }}
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
              color="var(--ink-accent)"
              glow="var(--ink-accent)"
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

          {/*
            Les boutons Succès / Titres / Récompenses ont quitté cette carte.
            Ils montaient leurs tiroirs *depuis l'intérieur* du tiroir profil, au
            même z-index, et n'étaient atteignables qu'en fouillant ce panneau.
            Ils vivent maintenant dans la grille de menus de l'accueil, au même
            niveau que Quêtes, Couleur du chat et Paramètres.
          */}

          {/*
            Déconnexion explicite, en bas de la carte.

            C'était une icône rouge sans libellé, posée en `absolute top-3
            right-3` — donc juste sous le bouton de fermeture du tiroir, dans le
            même coin. Deux petits boutons superposés verticalement, dont un seul
            est destructif et aucun n'est nommé : viser la fermeture et se
            déconnecter n'était qu'une question de quelques pixels.
          */}
          <button
            type="button"
            onClick={() => {
              playInkSound('inkClick', 0.3);
              signOut();
            }}
            className="menu-focus flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-white/80 transition-colors hover:text-white"
            style={{
              background: 'rgba(239,68,68,0.16)',
              border: '1px solid var(--ink-line)',
            }}
          >
            <LogOut className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            Se déconnecter
          </button>
        </div>
      </motion.div>
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
      border: '1px solid var(--ink-line)',
      boxShadow: `0 0 0 rgba(0,0,0,0)`,
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
        border: '1px solid var(--ink-line)',
        boxShadow: 'none',
      }}
    >
      <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
    </div>
    <div
      className="relative text-2xl font-black text-white leading-none"
      style={{
        fontFamily: "'Outfit', sans-serif",
        textShadow: GRAFFITI_TEXT_SHADOW_SM,
      }}
    >
      {value}
    </div>
    <div
      className="relative text-[10px] uppercase tracking-wider font-black text-white/55 mt-0.5"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {label}
    </div>
  </motion.div>
);

/*
 * `InkActionButton` a été supprimé avec les trois boutons qu'il servait. Ces
 * destinations sont désormais rendues par `InkMenuTile`, la primitive partagée,
 * dans la grille de menus de l'accueil.
 */

export const InkProfileSidebar = memo(InkProfileSidebarComponent);
