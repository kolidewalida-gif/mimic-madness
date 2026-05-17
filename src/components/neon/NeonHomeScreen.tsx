import { useState, useCallback, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { ArrowRight, ChevronLeft, ChevronRight, Hash, Play, Settings, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { LobbyGameMode } from '@/lib/gameModes';
import { NeonHUDFrame, NeonLabel, NeonTitle, NeonButton } from './NeonHUDFrame';
import { NEON_MODES, getNeonModeMeta } from './NeonGameModeSelector';
import { NeonProfileSidebar } from './NeonProfileSidebar';
import { NeonFriendsSidebar } from './NeonFriendsSidebar';
import { VolumeControl } from '@/components/VolumeControl';
import { SoundEffectsVolumeControl } from '@/components/SoundEffectsVolumeControl';
import { DeviceSettings } from '@/components/DeviceSettings';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NeonHomeScreenProps {
  onCreateGame: (playerName: string, gameMode?: LobbyGameMode) => void;
  onJoinGame: (playerName: string, lobbyCode: string) => void;
}

type ViewMode = 'home' | 'join' | 'settings';

const NeonHomeScreenComponent = ({ onCreateGame, onJoinGame }: NeonHomeScreenProps) => {
  const { profile } = useAuth();
  const { play } = useBackgroundMusic();
  const [playerName, setPlayerName] = useState('');
  const [lobbyCode, setLobbyCode] = useState('');
  const [view, setView] = useState<ViewMode>('home');
  const [activeIndex, setActiveIndex] = useState(0);

  const featured = NEON_MODES[activeIndex];

  useEffect(() => {
    if (profile?.display_name && !playerName) {
      setPlayerName(profile.display_name);
    }
  }, [profile?.display_name]);

  // Keyboard navigation through modes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (view !== 'home') return;
      if (e.key === 'ArrowLeft') {
        setActiveIndex((i) => (i - 1 + NEON_MODES.length) % NEON_MODES.length);
        playSoundEffect('hoverSoft', 0.2);
      } else if (e.key === 'ArrowRight') {
        setActiveIndex((i) => (i + 1) % NEON_MODES.length);
        playSoundEffect('hoverSoft', 0.2);
      } else if (e.key === 'Enter' && playerName.trim()) {
        handleCreate();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, playerName, activeIndex]);

  const handleCreate = useCallback(() => {
    if (!playerName.trim()) return;
    play();
    playSoundEffect('powerUp', 0.4);
    onCreateGame(playerName.trim(), featured.id);
  }, [playerName, featured.id, play, onCreateGame]);

  const handleJoin = useCallback(() => {
    if (!playerName.trim() || lobbyCode.length !== 4) return;
    play();
    playSoundEffect('powerUp', 0.4);
    onJoinGame(playerName.trim(), lobbyCode.trim().toUpperCase());
  }, [playerName, lobbyCode, play, onJoinGame]);

  const handleJoinFriend = (code: string) => {
    if (playerName.trim()) {
      onJoinGame(playerName.trim(), code);
    } else {
      setLobbyCode(code);
      setView('join');
    }
  };

  return (
    <div className="relative h-screen overflow-hidden bg-background text-foreground">
      {/* Top status bar */}
      <header className="relative z-20 flex items-center justify-between border-b border-primary/30 bg-background/60 px-6 py-2 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 animate-pulse rounded-full bg-success shadow-[0_0_8px_hsl(var(--success))]" />
          <NeonLabel>Online • Mimic Net v2.6</NeonLabel>
        </div>
        <NeonTitle as="h1" className="text-base md:text-lg">
          MIMIC MASTER
        </NeonTitle>
        <div className="flex items-center gap-2">
          <NeonLabel tone="muted" className="hidden md:inline">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}
          </NeonLabel>
          <button
            onClick={() => setView(view === 'settings' ? 'home' : 'settings')}
            className="rounded-sm border border-primary/40 p-1.5 text-primary hover:bg-primary/10"
            aria-label="Paramètres"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main hub */}
      <main className="relative z-10 flex h-[calc(100vh-44px)] gap-4 p-4">
        {/* Left: profile */}
        <aside className="hidden w-[280px] flex-shrink-0 lg:block">
          <ScrollArea className="h-full">
            <div className="pr-2">
              <NeonProfileSidebar />
            </div>
          </ScrollArea>
        </aside>

        {/* Center: hub */}
        <section className="flex flex-1 flex-col gap-4 min-w-0">
          {/* Pseudo input */}
          <NeonHUDFrame title="Identité Joueur" badge="REQ" innerClassName="p-3">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 flex-shrink-0 text-primary" />
              <Input
                placeholder="ENTREZ VOTRE PSEUDO..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="h-10 border-0 bg-transparent text-base font-bold uppercase tracking-[0.2em] text-foreground placeholder:text-foreground-muted focus-visible:ring-0"
                style={{ fontFamily: 'Rajdhani, sans-serif' }}
                maxLength={20}
              />
              {playerName.trim() && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-success">
                  ✓ Validé
                </span>
              )}
            </div>
          </NeonHUDFrame>

          {/* Featured carousel */}
          <NeonHUDFrame
            title={view === 'join' ? 'Rejoindre une partie' : 'Sélection du mode'}
            badge={`${activeIndex + 1}/${NEON_MODES.length}`}
            innerClassName="p-0"
            className="flex-1 min-h-0"
          >
            <AnimatePresence mode="wait">
              {view === 'join' ? (
                <motion.div
                  key="join"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="flex h-full flex-col items-center justify-center gap-6 p-8"
                >
                  <div className="text-center">
                    <Hash className="mx-auto mb-2 h-8 w-8 text-secondary" />
                    <NeonLabel tone="secondary">Code du lobby</NeonLabel>
                  </div>
                  <Input
                    placeholder="XXXX"
                    value={lobbyCode}
                    onChange={(e) => setLobbyCode(e.target.value.toUpperCase().slice(0, 4))}
                    onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
                    maxLength={4}
                    autoFocus
                    className="h-20 w-64 border-2 border-secondary/60 bg-background/80 text-center text-5xl font-black tracking-[0.4em] text-secondary focus-visible:ring-2 focus-visible:ring-secondary"
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                  />
                  <div className="flex gap-3">
                    <NeonButton variant="ghost" onClick={() => setView('home')}>
                      <ChevronLeft className="h-4 w-4" />
                      Retour
                    </NeonButton>
                    <NeonButton
                      variant="magenta"
                      onClick={handleJoin}
                      disabled={!playerName.trim() || lobbyCode.length !== 4}
                    >
                      Rejoindre
                      <ArrowRight className="h-4 w-4" />
                    </NeonButton>
                  </div>
                </motion.div>
              ) : view === 'settings' ? (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full overflow-y-auto p-6"
                >
                  <div className="space-y-4">
                    <VolumeControl />
                    <SoundEffectsVolumeControl />
                    <div className="rounded-sm border border-primary/30 bg-background/40 p-4">
                      <DeviceSettings showPreview onClose={() => setView('home')} />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={featured.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.04 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="relative flex h-full flex-col"
                >
                  {/* Big hero artwork */}
                  <div className="relative flex-1 overflow-hidden">
                    <div
                      className={cn(
                        'absolute inset-0 bg-gradient-to-br opacity-25 blur-3xl',
                        featured.accent
                      )}
                    />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,hsl(var(--background))_85%)]" />

                    {/* Centered glyph + name */}
                    <div className="relative flex h-full flex-col items-center justify-center px-6">
                      <div
                        className={cn(
                          'mb-4 flex h-24 w-24 items-center justify-center rounded-sm bg-gradient-to-br text-white shadow-[0_0_60px_hsl(var(--primary)/0.5)]',
                          featured.accent
                        )}
                      >
                        <div className="scale-[2.2]">{featured.icon}</div>
                      </div>
                      <NeonLabel tone="primary" className="mb-2">
                        {featured.tag}
                      </NeonLabel>
                      <h2
                        className="text-center text-4xl font-black uppercase tracking-[0.1em] text-foreground md:text-5xl neon-text-glow"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                      >
                        {featured.name}
                      </h2>
                      <p className="mt-3 max-w-md text-center text-sm text-foreground-secondary">
                        {featured.description}
                      </p>

                      <div className="mt-4 flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.3em] text-foreground-muted">
                        <span>{featured.minPlayers}+ joueurs</span>
                        <span className="h-1 w-1 rounded-full bg-primary" />
                        <span>{featured.duration}</span>
                      </div>

                      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                        <NeonButton
                          variant="primary"
                          size="lg"
                          onClick={handleCreate}
                          disabled={!playerName.trim()}
                        >
                          <Play className="h-4 w-4" fill="currentColor" />
                          Lancer
                        </NeonButton>
                        <NeonButton
                          variant="ghost"
                          size="lg"
                          onClick={() => {
                            playSoundEffect('click', 0.3);
                            setView('join');
                          }}
                        >
                          <Hash className="h-4 w-4" />
                          Rejoindre
                        </NeonButton>
                      </div>
                    </div>
                  </div>

                  {/* Carousel strip */}
                  <div className="relative border-t border-primary/30 bg-background/50 backdrop-blur-sm">
                    <button
                      onClick={() => setActiveIndex((i) => (i - 1 + NEON_MODES.length) % NEON_MODES.length)}
                      className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-sm border border-primary/40 bg-background/80 p-2 text-primary hover:bg-primary/20"
                      aria-label="Mode précédent"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setActiveIndex((i) => (i + 1) % NEON_MODES.length)}
                      className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-sm border border-primary/40 bg-background/80 p-2 text-primary hover:bg-primary/20"
                      aria-label="Mode suivant"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>

                    <div className="flex gap-2 overflow-x-auto px-12 py-3 scrollbar-thin">
                      {NEON_MODES.map((m, i) => {
                        const isActive = i === activeIndex;
                        return (
                          <button
                            key={m.id}
                            onClick={() => {
                              setActiveIndex(i);
                              playSoundEffect('hoverSoft', 0.2);
                            }}
                            className={cn(
                              'group flex flex-shrink-0 items-center gap-2 rounded-sm border px-3 py-2 transition-all',
                              '[clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]',
                              isActive
                                ? 'border-primary bg-primary/15 shadow-[0_0_18px_hsl(var(--primary)/0.45)]'
                                : 'border-primary/20 bg-card/40 hover:border-primary/60'
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-7 w-7 items-center justify-center rounded-sm bg-gradient-to-br text-white',
                                m.accent
                              )}
                            >
                              {m.icon}
                            </span>
                            <span
                              className={cn(
                                'text-xs font-bold uppercase tracking-widest',
                                isActive ? 'text-primary' : 'text-foreground-secondary'
                              )}
                            >
                              {m.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </NeonHUDFrame>
        </section>

        {/* Right: friends */}
        <aside className="hidden w-[280px] flex-shrink-0 lg:block">
          <ScrollArea className="h-full">
            <div className="pl-2">
              <NeonFriendsSidebar onJoinFriend={handleJoinFriend} />
            </div>
          </ScrollArea>
        </aside>
      </main>
    </div>
  );
};

export const NeonHomeScreen = memo(NeonHomeScreenComponent);