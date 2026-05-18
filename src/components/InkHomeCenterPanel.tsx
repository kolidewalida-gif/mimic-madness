import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { ArrowRight, Library, LogOut, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { LobbyGameMode } from '@/lib/gameModes';
import { InkPatchNoteModal, CURRENT_VERSION } from '@/components/InkPatchNoteModal';

interface InkHomeCenterPanelProps {
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  lobbyCode: string;
  onLobbyCodeChange: (code: string) => void;
  onCreateGame: (playerName: string, gameMode?: LobbyGameMode) => void;
  onJoinGame: (playerName: string, lobbyCode: string) => void;
}

const InkHomeCenterPanelComponent = ({
  playerName,
  onPlayerNameChange,
  onCreateGame,
  onJoinGame,
}: InkHomeCenterPanelProps) => {
  const { profile, signOut } = useAuth();
  const [showPatchNote, setShowPatchNote] = useState(false);
  const { play } = useBackgroundMusic();

  const initializedFromProfileRef = useRef(false);
  useEffect(() => {
    if (initializedFromProfileRef.current) return;
    if (profile?.display_name) {
      initializedFromProfileRef.current = true;
      onPlayerNameChange(profile.display_name);
    }
  }, [profile?.display_name, onPlayerNameChange]);

  const handleCreateGame = useCallback(() => {
    if (playerName.trim()) {
      play();
      playInkSound('inkSuccess', 0.5);
      onCreateGame(playerName.trim(), 'audiophone');
    }
  }, [playerName, play, onCreateGame]);

  const handleJoinGame = useCallback(() => {
    if (playerName.trim()) {
      play();
      playInkSound('inkSuccess', 0.5);
      // Open join flow - will be handled by parent
      onJoinGame(playerName.trim(), '');
    }
  }, [playerName, play, onJoinGame]);

  const handleLibrary = useCallback(() => {
    playInkSound('brushTap', 0.3);
    // TODO: Open game library
  }, []);

  const handleDisconnect = useCallback(() => {
    playInkSound('inkClick', 0.3);
    signOut();
  }, [signOut]);

  return (
    <div className="h-full w-full bg-[#050505]/95 backdrop-blur-md border border-[#ff2b2b]/30 rounded-2xl flex flex-col items-center justify-start pt-24 relative">
      {/* Volumetric red fog background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-[#ff2b2b]/15 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-[#ff2b2b]/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#ff2b2b]/8 rounded-full blur-[140px]" />
      </div>

      {/* Profile Photo - Floating above */}
      <motion.div
        initial={{ opacity: 0, y: -30, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-20"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-[#ff2b2b]/40 rounded-full blur-xl animate-pulse" />
          <div className="relative w-32 h-32 rounded-full border-4 border-[#ff2b2b]/60 overflow-hidden bg-[#050505]">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={playerName || 'Profile'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-[#ff2b2b]">
                {(playerName || 'M')[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-8 px-8 pt-20">
        {/* Huge Pseudo */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-3xl md:text-4xl font-black text-white tracking-tight text-center"
          style={{
            textShadow: '0 0 40px rgba(255, 43, 43, 0.6), 0 0 80px rgba(255, 43, 43, 0.3)',
          }}
        >
          {playerName || 'JOUEUR'}
        </motion.h2>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="w-full max-w-md space-y-3"
        >
          {/* Créer une partie */}
          <motion.button
            onClick={handleCreateGame}
            disabled={!playerName.trim()}
            whileHover={{ scale: 1.02, boxShadow: '0 0 60px rgba(255, 43, 43, 0.5)' }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300',
              'bg-[#050505] border-2 border-[#ff2b2b] text-[#ff2b2b]',
              'hover:bg-[#ff2b2b] hover:text-white',
              'disabled:opacity-30 disabled:cursor-not-allowed',
              'relative overflow-hidden group'
            )}
            style={{
              boxShadow: '0 0 30px rgba(255, 43, 43, 0.3)',
            }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              Créer une partie
              <ArrowRight className="w-5 h-5" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-[#ff2b2b]/0 via-[#ff2b2b]/20 to-[#ff2b2b]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          </motion.button>

          {/* Rejoindre une partie */}
          <motion.button
            onClick={handleJoinGame}
            disabled={!playerName.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300',
              'bg-[#050505] border border-[#ff2b2b]/50 text-white',
              'hover:border-[#ff2b2b] hover:bg-[#ff2b2b]/10',
              'disabled:opacity-30 disabled:cursor-not-allowed'
            )}
          >
            <span className="flex items-center justify-center gap-2">
              <Users className="w-5 h-5" />
              Rejoindre une partie
            </span>
          </motion.button>

          {/* Bibliothèque */}
          <motion.button
            onClick={handleLibrary}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 bg-[#050505] border border-[#ff2b2b]/50 text-white hover:border-[#ff2b2b] hover:bg-[#ff2b2b]/10"
          >
            <span className="flex items-center justify-center gap-2">
              <Library className="w-5 h-5" />
              Bibliothèque
            </span>
          </motion.button>

          {/* Déconnexion */}
          <motion.button
            onClick={handleDisconnect}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-2.5 px-6 rounded-xl font-medium text-sm transition-all duration-300 bg-transparent border border-[#ff2b2b]/30 text-[#ff2b2b]/70 hover:border-[#ff2b2b]/60 hover:text-[#ff2b2b]"
          >
            <span className="flex items-center justify-center gap-2">
              <LogOut className="w-4 h-4" />
              Déconnexion
            </span>
          </motion.button>
        </motion.div>

        {/* Version button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          onClick={() => {
            playInkSound('brushTap', 0.2);
            setShowPatchNote(true);
          }}
          className="absolute bottom-4 right-4 flex items-center gap-1.5 py-1.5 px-3 text-[#ff2b2b]/40 hover:text-[#ff2b2b]/70 transition-colors text-xs"
        >
          <span className="text-[10px] font-mono">v{CURRENT_VERSION}</span>
          Notes
        </motion.button>
      </div>

      {/* Patch Note Modal */}
      <InkPatchNoteModal
        forceOpen={showPatchNote}
        onClose={() => setShowPatchNote(false)}
      />
    </div>
  );
};

export const InkHomeCenterPanel = memo(InkHomeCenterPanelComponent);
