import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { motion, PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { useIsMobile } from '@/hooks/use-mobile';
import { LobbyGameMode } from '@/lib/gameModes';
import { InkHomeCenterPanel } from '@/components/InkHomeCenterPanel';
import { InkSettingsPanel } from '@/components/InkSettingsPanel';
import { InkProfileFriendsPanel } from '@/components/InkProfileFriendsPanel';

export type InkHomePanel = 'settings' | 'home' | 'friends';

const PANEL_ORDER: InkHomePanel[] = ['settings', 'home', 'friends'];

const PANEL_LABELS: Record<InkHomePanel, string> = {
  settings: 'Paramètres',
  home: 'Accueil',
  friends: 'Profil et amis',
};

interface InkHomeCarouselProps {
  onCreateGame: (playerName: string, gameMode?: LobbyGameMode) => void;
  onJoinGame: (playerName: string, lobbyCode: string) => void;
}

const InkHomeCarouselComponent = ({ onCreateGame, onJoinGame }: InkHomeCarouselProps) => {
  const isMobile = useIsMobile();
  const [activePanel, setActivePanel] = useState<InkHomePanel>('home');
  // Lifted state so the right panel's "join friend" flow can populate the
  // join input in the center panel and so the pseudo persists across panels.
  const [playerName, setPlayerName] = useState('');
  const [lobbyCode, setLobbyCode] = useState('');

  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const panelRefs = useRef<Record<InkHomePanel, HTMLDivElement | null>>({
    settings: null,
    home: null,
    friends: null,
  });

  // FEAT-001 step 3 calls for a 640px boundary; we deliberately reuse the
  // existing useIsMobile() hook (768px) to avoid introducing a new hook.
  // Documented in the feature findings.
  const previewBand = isMobile ? 0.12 : 0.2;
  const panelWidth = trackWidth > 0 ? trackWidth * (1 - 2 * previewBand) : 0;
  const sidePreviewWidth = trackWidth * previewBand;

  // Measure the track width and react to viewport resizes.
  useLayoutEffect(() => {
    if (!trackRef.current) return;
    const node = trackRef.current;

    const updateWidth = () => setTrackWidth(node.clientWidth);
    updateWidth();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateWidth);
      observer.observe(node);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const activeIndex = PANEL_ORDER.indexOf(activePanel);

  // Translate so that the active panel sits inside the visible center band,
  // i.e. its left edge is at sidePreviewWidth from the track's left.
  const targetX = useMemo(() => {
    if (trackWidth === 0) return 0;
    return sidePreviewWidth - activeIndex * panelWidth;
  }, [activeIndex, panelWidth, sidePreviewWidth, trackWidth]);

  const goTo = useCallback(
    (next: InkHomePanel, source: 'arrow' | 'indicator' | 'swipe' | 'keyboard') => {
      if (next === activePanel) return;

      switch (source) {
        case 'arrow':
          playInkSound('brushTap', 0.4);
          break;
        case 'indicator':
          playInkSound('inkClick', 0.3);
          break;
        case 'swipe':
          playInkSound('inkTransition', 0.35);
          break;
        case 'keyboard':
          playInkSound('brushTap', 0.4);
          break;
      }

      // Subtle accent when a side panel becomes the active one.
      if (next !== 'home') {
        playInkSound('inkSuccess', 0.5);
      }

      setActivePanel(next);
    },
    [activePanel]
  );

  const goPrev = useCallback(
    (source: 'arrow' | 'keyboard' | 'swipe') => {
      const idx = PANEL_ORDER.indexOf(activePanel);
      if (idx > 0) goTo(PANEL_ORDER[idx - 1], source);
    },
    [activePanel, goTo]
  );

  const goNext = useCallback(
    (source: 'arrow' | 'keyboard' | 'swipe') => {
      const idx = PANEL_ORDER.indexOf(activePanel);
      if (idx < PANEL_ORDER.length - 1) goTo(PANEL_ORDER[idx + 1], source);
    },
    [activePanel, goTo]
  );

  // Keyboard navigation: ArrowLeft / ArrowRight. Skip if focus is in a text
  // input, textarea, or contenteditable element so typing the pseudo or the
  // lobby code does not navigate the carousel.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          target.isContentEditable
        ) {
          return;
        }
      }

      if (event.key === 'ArrowLeft') goPrev('keyboard');
      else goNext('keyboard');
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goPrev, goNext]);

  // Focus management: move focus to the active panel after each switch.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      panelRefs.current[activePanel]?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
  }, [activePanel]);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x < -40) {
        goNext('swipe');
      } else if (info.offset.x > 40) {
        goPrev('swipe');
      }
    },
    [goNext, goPrev]
  );

  const handleFriendJoin = useCallback(
    (code: string) => {
      setLobbyCode(code);
      if (playerName.trim()) {
        onJoinGame(playerName.trim(), code);
      }
    },
    [playerName, onJoinGame]
  );

  const renderPanelContent = (panel: InkHomePanel) => {
    switch (panel) {
      case 'settings':
        return <InkSettingsPanel />;
      case 'home':
        return (
          <InkHomeCenterPanel
            playerName={playerName}
            onPlayerNameChange={setPlayerName}
            lobbyCode={lobbyCode}
            onLobbyCodeChange={setLobbyCode}
            onCreateGame={onCreateGame}
            onJoinGame={onJoinGame}
          />
        );
      case 'friends':
        return <InkProfileFriendsPanel onJoinFriend={handleFriendJoin} />;
    }
  };

  const isFirst = activeIndex === 0;
  const isLast = activeIndex === PANEL_ORDER.length - 1;

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      {/* Track */}
      <div
        ref={trackRef}
        className="relative flex-1 min-h-0 overflow-hidden"
      >
        {trackWidth > 0 && (
          <motion.div
            className="absolute inset-y-0 left-0 flex"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            animate={{ x: targetX }}
            transition={{ type: 'spring', stiffness: 260, damping: 32 }}
            style={{ width: panelWidth * PANEL_ORDER.length }}
          >
            {PANEL_ORDER.map((panel) => {
              const isActive = panel === activePanel;
              return (
                <div
                  key={panel}
                  className="h-full px-2 flex-shrink-0"
                  style={{ width: panelWidth }}
                >
                  <motion.div
                    animate={
                      isActive
                        ? { rotate: 0 }
                        : { rotate: [-0.15, 0.15, -0.1] }
                    }
                    transition={
                      isActive
                        ? { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
                        : { repeat: Infinity, duration: 6, ease: 'easeInOut' }
                    }
                    className={cn(
                      'h-full rounded-2xl overflow-hidden transition-[opacity,border-color] duration-300',
                      isActive
                        ? 'border border-solid border-primary/30 opacity-100 pointer-events-auto'
                        : 'border border-dashed border-primary/60 opacity-50 pointer-events-none'
                    )}
                  >
                    <div
                      ref={(el) => {
                        panelRefs.current[panel] = el;
                      }}
                      tabIndex={-1}
                      role="region"
                      aria-label={PANEL_LABELS[panel]}
                      aria-hidden={!isActive}
                      className="h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0 rounded-2xl"
                    >
                      {renderPanelContent(panel)}
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Navigation arrows - always visible */}
        <motion.button
          type="button"
          onClick={() => goPrev('arrow')}
          disabled={isFirst}
          whileHover={isFirst ? undefined : { scale: 1.08 }}
          whileTap={isFirst ? undefined : { scale: 0.94 }}
          aria-label="Panneau précédent"
          className={cn(
            'absolute left-2 top-1/2 -translate-y-1/2 z-20',
            'rounded-full p-2 bg-card/40 backdrop-blur-sm',
            'border border-primary/40 text-primary',
            'transition-opacity duration-200',
            isFirst ? 'opacity-30 cursor-not-allowed' : 'opacity-100 hover:bg-card/60'
          )}
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>

        <motion.button
          type="button"
          onClick={() => goNext('arrow')}
          disabled={isLast}
          whileHover={isLast ? undefined : { scale: 1.08 }}
          whileTap={isLast ? undefined : { scale: 0.94 }}
          aria-label="Panneau suivant"
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 z-20',
            'rounded-full p-2 bg-card/40 backdrop-blur-sm',
            'border border-primary/40 text-primary',
            'transition-opacity duration-200',
            isLast ? 'opacity-30 cursor-not-allowed' : 'opacity-100 hover:bg-card/60'
          )}
        >
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Page indicators */}
      <div className="flex-shrink-0 flex items-center justify-center gap-2 py-2">
        {PANEL_ORDER.map((panel, idx) => {
          const isActive = panel === activePanel;
          return (
            <button
              key={panel}
              type="button"
              onClick={() => goTo(panel, 'indicator')}
              aria-label={`Aller au panneau ${idx + 1} de ${PANEL_ORDER.length}`}
              className={cn(
                'rounded-full transition-all duration-200',
                isActive
                  ? 'w-2 h-2 bg-primary'
                  : 'w-1.5 h-1.5 border border-primary/50 bg-transparent hover:border-primary'
              )}
            />
          );
        })}
      </div>
    </div>
  );
};

export const InkHomeCarousel = memo(InkHomeCarouselComponent);
