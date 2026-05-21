import { memo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, LogOut, Gamepad2, Trophy, Flame, Target, Pencil, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEquippedTitle } from '@/hooks/useEquippedTitle';
import { useGlobalPlayerAvatar } from '@/hooks/useGlobalPlayerAvatar';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { LevelProgressBar } from '@/components/LevelProgressBar';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { supabase } from '@/integrations/supabase/client';

const InkProfileCardComponent = () => {
  const { user, profile, stats, isLoading, signInWithGoogle, signOut, updateProfile } = useAuth();
  const { equippedTitle } = useEquippedTitle();
  const { avatarData, setAvatarImage } = useGlobalPlayerAvatar(user?.id || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStartEdit = useCallback(() => {
    setEditName(profile?.display_name || '');
    setIsEditingName(true);
    playInkSound('brushTap', 0.3);
  }, [profile?.display_name]);

  const handleSaveName = useCallback(async () => {
    if (editName.trim()) {
      await updateProfile({ display_name: editName.trim() });
    }
    setIsEditingName(false);
    playInkSound('inkSuccess', 0.3);
  }, [editName, updateProfile]);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    playInkSound('inkSplash', 0.3);

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    if (data?.publicUrl) {
      await setAvatarImage(data.publicUrl);
      await updateProfile({ avatar_url: data.publicUrl });
    }
  }, [user, setAvatarImage, updateProfile]);

  const winRate = stats && stats.games_played > 0
    ? Math.round((stats.games_won / stats.games_played) * 100)
    : 0;

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4 animate-pulse">
        <div className="w-20 h-20 rounded-full bg-white/10 mx-auto" />
        <div className="h-4 bg-white/10 rounded w-2/3 mx-auto" />
        <div className="h-3 bg-white/10 rounded w-1/2 mx-auto" />
        <div className="h-8 bg-white/10 rounded" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-4">
        <p className="text-white/60 text-sm text-center">Connectez-vous pour sauvegarder votre progression</p>
        <motion.button
          onClick={() => { playInkSound('brushTap', 0.4); signInWithGoogle(); }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-3 px-4 rounded-xl bg-white text-black font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/90 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Login with Google
        </motion.button>
      </div>
    );
  }

  // Logged in
  return (
    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4">
      {/* Avatar with 3D rotation */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <motion.div
            animate={{ rotateY: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <Avatar className="w-20 h-20 ring-2 ring-red-500/50">
              <AvatarImage src={avatarData.imageUrl || profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-red-500/20 text-red-400 text-2xl font-bold">
                {profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </motion.div>
          <motion.button
            onClick={() => { playInkSound('inkClick', 0.3); fileInputRef.current?.click(); }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg"
          >
            <Camera className="w-3.5 h-3.5" />
          </motion.button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>

        {/* Editable name */}
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <div className="flex items-center gap-1">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); }}
                className="h-7 w-32 text-sm bg-white/5 border-white/20 text-white text-center"
                maxLength={20}
                autoFocus
              />
              <motion.button
                onClick={handleSaveName}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400"
              >
                <Check className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-white font-semibold text-sm">{profile?.display_name || 'Player'}</span>
              <motion.button
                onClick={handleStartEdit}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-5 h-5 rounded-full flex items-center justify-center text-white/40 hover:text-white/80"
              >
                <Pencil className="w-3 h-3" />
              </motion.button>
            </div>
          )}
        </div>

        {/* Equipped title badge */}
        <AnimatePresence>
          {equippedTitle && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium"
            >
              {equippedTitle.name}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Level Progress */}
      <LevelProgressBar compact className="px-1" />

      {/* Win Rate Card */}
      <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
        <div className="text-3xl font-black text-red-400">{winRate}%</div>
        <div className="text-xs text-white/50">Win Rate</div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/5 rounded-lg p-2 text-center border border-white/5">
          <Gamepad2 className="w-4 h-4 mx-auto mb-1 text-blue-400" />
          <div className="text-sm font-bold text-white">{stats?.games_played || 0}</div>
          <div className="text-[10px] text-white/40">Parties</div>
        </div>
        <div className="bg-white/5 rounded-lg p-2 text-center border border-white/5">
          <Trophy className="w-4 h-4 mx-auto mb-1 text-yellow-400" />
          <div className="text-sm font-bold text-white">{stats?.games_won || 0}</div>
          <div className="text-[10px] text-white/40">Victoires</div>
        </div>
        <div className="bg-white/5 rounded-lg p-2 text-center border border-white/5">
          <Flame className="w-4 h-4 mx-auto mb-1 text-orange-400" />
          <div className="text-sm font-bold text-white">{stats?.current_streak || 0}</div>
          <div className="text-[10px] text-white/40">Streak</div>
        </div>
        <div className="bg-white/5 rounded-lg p-2 text-center border border-white/5">
          <Target className="w-4 h-4 mx-auto mb-1 text-green-400" />
          <div className="text-sm font-bold text-white">{stats?.best_streak || 0}</div>
          <div className="text-[10px] text-white/40">Best Streak</div>
        </div>
      </div>

      {/* Sign Out */}
      <motion.button
        onClick={() => { playInkSound('paperSlide', 0.3); signOut(); }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="w-full py-2 px-3 rounded-lg text-xs text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5 border border-transparent hover:border-red-500/20"
      >
        <LogOut className="w-3 h-3" />
        Sign out
      </motion.button>
    </div>
  );
};

export const InkProfileCard = memo(InkProfileCardComponent);
