import { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { LobbyGameMode } from '@/lib/gameModes';
import { InkCursorParticles } from '@/components/InkCursorParticles';
import { InkPatchNoteModal } from '@/components/InkPatchNoteModal';
import { InkProfileSidebar } from '@/components/InkProfileSidebar';
import { InkFriendsSidebar } from '@/components/InkFriendsSidebar';
import { InkHomeCenterPanel } from '@/components/InkHomeCenterPanel';

interface InkHomeScreenProps {
  onCreateGame: (playerName: string, gameMode?: LobbyGameMode) => void;
  onJoinGame: (playerName: string, lobbyCode: string) => void;
}

const InkHomeScreenComponent = ({ onCreateGame, onJoinGame }: InkHomeScreenProps) => {
  const [playerName, setPlayerName] = useState('');
  const [lobbyCode, setLobbyCode] = useState('');

  const handleJoinFriend = useCallback(
    (code: string) => {
      setLobbyCode(code);
      if (playerName.trim()) onJoinGame(playerName.trim(), code);
    },
    [playerName, onJoinGame]
  );

  return (
    <div className="h-screen flex flex-col bg-[#050505] text-foreground relative overflow-hidden">
      {/* Ink Cursor Particles Effect */}
      <InkCursorParticles />

      {/* Volumetric red fog background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#ff2b2b]/12 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#ff2b2b]/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#ff2b2b]/8 rounded-full blur-[160px]" />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#ff2b2b]/5 via-transparent to-[#ff2b2b]/5" />
      </div>

      {/* Title Header */}
      <header className="relative z-10 pt-6 pb-4 text-center flex-shrink-0">
        <motion.h1
          className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight"
          initial={{ opacity: 0, y: -30, letterSpacing: '0.4em', filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, letterSpacing: '-0.02em', filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "'Caveat', cursive",
            color: '#ff2b2b',
            textShadow: '0 0 40px rgba(255, 43, 43, 0.6), 0 0 80px rgba(255, 43, 43, 0.4), 0 0 120px rgba(255, 43, 43, 0.2)',
          }}
        >
          MIMIC MASTER
        </motion.h1>
      </header>

      {/* Main Content - 3 columns layout */}
      <main className="flex-1 flex items-stretch justify-center px-4 pb-28 relative z-10 min-h-0 overflow-hidden">
        <div className="w-full max-w-[1600px] grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-4 h-full">
          <aside className="hidden lg:block h-full min-h-0 overflow-y-auto rounded-2xl border border-[#ff2b2b]/20">
            <InkProfileSidebar />
          </aside>
          <section className="h-full min-h-0 overflow-y-auto rounded-2xl border-2 border-[#ff2b2b]/50 shadow-[0_0_60px_rgba(255,43,43,0.35)]">
            <InkHomeCenterPanel
              playerName={playerName}
              onPlayerNameChange={setPlayerName}
              lobbyCode={lobbyCode}
              onLobbyCodeChange={setLobbyCode}
              onCreateGame={onCreateGame}
              onJoinGame={onJoinGame}
            />
          </section>
          <aside className="hidden lg:block h-full min-h-0 overflow-y-auto rounded-2xl border border-[#ff2b2b]/20">
            <InkFriendsSidebar onJoinFriend={handleJoinFriend} />
          </aside>
        </div>
      </main>

      {/* Patch Note Modal — auto-opens on new version */}
      <InkPatchNoteModal />
    </div>
  );
};

export const InkHomeScreen = memo(InkHomeScreenComponent);
