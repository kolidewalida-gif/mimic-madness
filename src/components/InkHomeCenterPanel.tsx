import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { ArrowRight, ChevronLeft, Hash, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { toast } from 'sonner';
import { LobbyGameMode } from '@/lib/gameModes';
import { InkPatchNoteModal, CURRENT_VERSION } from '@/components/InkPatchNoteModal';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { INK_PANEL_GLASS_STYLE } from '@/components/ink-panel-styles';

interface InkHomeCenterPanelProps {
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  lobbyCode: string;
  onLobbyCodeChange: (code: string) => void;
  onCreateGame: (playerName: string, gameMode?: LobbyGameMode) => void;
  onJoinGame: (playerName: string, lobbyCode: string) => void;
}

type ViewMode = 'home' | 'join';

const InkHomeCenterPanelComponent = ({
  playerName,
  onPlayerNameChange,
  lobbyCode,
  onLobbyCodeChange,
  onCreateGame,
  onJoinGame,
}: InkHomeCenterPanelProps) => {
  const { profile, signOut } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [showPatchNote, setShowPatchNote] = useState(false);
  const { play } = useBackgroundMusic();

  // Initialize the pseudo from the profile display name exactly once.
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
    if (playerName.trim() && lobbyCode.trim()) {
      play();
      playInkSound('inkSuccess', 0.5);
      onJoinGame(playerName.trim(), lobbyCode.trim().toUpperCase());
    }
  }, [playerName, lobbyCode, play, onJoinGame]);

  const handleBibliotheque = useCallback(() => {
    playInkSound('brushTap', 0.3);
    toast('Bientôt disponible !');
  }, []);

  const handleSignOut = useCallback(() => {
    playInkSound('brushTap', 0.3);
    signOut();
  }, [signOut]);

  const avatarUrl = profile?.avatar_url;
  const displayName = profile?.display_name || playerName || 'Joueur';

  return (
    <div
      className="h-full w-full flex flex-col items-center rounded-2xl overflow-hidden relative"
      style={INK_PANEL_GLASS_STYLE}
    >
      {/* Avatar - overflows slightly above */}
      <div className="flex-shrink-0 -mt-4 pt-8 flex flex-col items-center gap-2">
        <div
          className="rounded-full p-1"
          style={{
            boxShadow: '0 0 20px rgba(255,43,43,0.5), 0 0 40px rgba(255,43,43,0.2)',
            border: '2px solid rgba(255,43,43,0.6)',
          }}
        >
          <Avatar className="w-20 h-20 md:w-24 md:h-24">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={displayName} />
            ) : null}
            <AvatarFallback className="bg-black/80 text-[#ff2b2b] text-2xl font-bold">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-white truncate max-w-[200px]">
          {displayName}
        </h2>
      </div>

      {/* Main content area */}
      <div className="flex-1 w-full px-4 md:px-6 py-4 flex flex-col min-h-0 overflow-y-auto">
        <AnimatePresence mode="wait" initial={false}>
          {viewMode === 'home' ? (
            <motion.div
              key="home-actions"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex-1 flex flex-col gap-3"
            >
              {/* Player name input */}
              <Input
                placeholder="Entrez votre pseudo..."
                value={playerName}
                onChange={(e) => onPlayerNameChange(e.target.value)}
                className="h-11 bg-black/50 border border-[#ff2b2b]/30 rounded-xl text-center text-white placeholder:text-gray-500 focus:border-[#ff2b2b] focus:ring-1 focus:ring-[#ff2b2b]/50"
              />

              {/* Creer une partie */}
              <motion.button
                onClick={handleCreateGame}
                disabled={!playerName.trim()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'w-full py-3 px-5 rounded-xl font-bold text-base transition-all duration-200',
                  'bg-black border border-[#ff2b2b]/50 text-[#ff2b2b]',
                  'hover:border-[#ff2b2b] hover:shadow-[0_0_20px_rgba(255,43,43,0.3)]',
                  'disabled:opacity-40 disabled:cursor-not-allowed'
                )}
              >
                <span className="flex items-center justify-center gap-2">
                  Créer une partie
                  <ArrowRight className="w-4 h-4" />
                </span>
              </motion.button>

              {/* Rejoindre une partie */}
              <motion.button
                onClick={() => {
                  playInkSound('brushTap', 0.3);
                  setViewMode('join');
                }}
                disabled={!playerName.trim()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'w-full py-3 px-5 rounded-xl font-semibold text-base transition-all duration-200',
                  'bg-black border border-[#ff2b2b]/30 text-[#ff2b2b]/80',
                  'hover:border-[#ff2b2b]/60 hover:text-[#ff2b2b] hover:shadow-[0_0_15px_rgba(255,43,43,0.2)]',
                  'disabled:opacity-40 disabled:cursor-not-allowed'
                )}
              >
                Rejoindre une partie
              </motion.button>

              {/* Bibliotheque */}
              <motion.button
                onClick={handleBibliotheque}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'w-full py-3 px-5 rounded-xl font-semibold text-base transition-all duration-200',
                  'bg-black border border-[#ff2b2b]/20 text-[#ff2b2b]/60',
                  'hover:border-[#ff2b2b]/40 hover:text-[#ff2b2b]/80 hover:shadow-[0_0_10px_rgba(255,43,43,0.15)]'
                )}
              >
                Bibliothèque
              </motion.button>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Deconnexion */}
              <motion.button
                onClick={handleSignOut}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2 px-4 rounded-xl text-sm transition-all duration-200 text-gray-500 hover:text-[#ff2b2b]/70 flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                Déconnexion
              </motion.button>

              {/* Patch note link */}
              <button
                onClick={() => {
                  playInkSound('brushTap', 0.2);
                  setShowPatchNote(true);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1 text-gray-600 hover:text-[#ff2b2b]/60 transition-colors text-xs"
              >
                <span className="text-[10px] font-mono opacity-60">v{CURRENT_VERSION}</span>
                Notes de version
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="join-actions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex-1 flex flex-col gap-3"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-gray-400">
                  <Hash className="h-3 w-3" />
                  Code du Lobby
                </label>
                <Input
                  placeholder="XXXX"
                  value={lobbyCode}
                  onChange={(e) => onLobbyCodeChange(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
                  maxLength={4}
                  className="text-center text-2xl tracking-[0.3em] uppercase font-bold h-14 bg-black/50 border-2 border-[#ff2b2b]/50 rounded-xl text-white focus:border-[#ff2b2b]"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    playInkSound('brushTap', 0.3);
                    setViewMode('home');
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-gray-700 text-gray-300 hover:border-[#ff2b2b]/50 hover:text-[#ff2b2b] transition-all flex items-center justify-center gap-1 text-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Retour
                </button>
                <button
                  onClick={handleJoinGame}
                  disabled={!playerName.trim() || lobbyCode.length !== 4}
                  className={cn(
                    'flex-1 py-2.5 px-4 rounded-xl font-semibold transition-all text-sm',
                    'bg-[#ff2b2b] text-white hover:bg-[#ff2b2b]/90',
                    'disabled:opacity-40 disabled:cursor-not-allowed'
                  )}
                >
                  Rejoindre
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
