import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { motion, PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playInkSound } from '@/hooks/useInkSoundEffects';
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

// 3D transform configs for each panel position relative to active
const PANEL_VARIANTS = {
  left: {
    x: '-55%',
    scale: 0.82,
    rotateY: 8,
    opacity: 0.45,
    zIndex: 10,
    filter: 'blur(2px)',
  },
  center: {
    x: '0%',
    scale: 1,
    rotateY: 0,
    opacity: 1,
    zIndex: 30,
    filter: 'blur(0px)',
  },
  right: {
    x: '55%',
    scale: 0.82,
    rotateY: -8,
    opacity: 0.45,
    zIndex: 10,
    filter: 'blur(2px)',
  },
};

type PanelPosition = 'left' | 'center' | 'right';

function getPanelPosition(panelIdx: number, activeIdx: number): PanelPosition {
  if (panelIdx === activeIdx) return 'center';
  if (panelIdx < activeIdx) return 'left';
  return 'right';
}

const TRANSITION = {
  duration: 0.6,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const InkHomeCarouselComponent = ({ onCreateGame, onJoinGame }: InkHomeCarouselProps) => {
  const [activePanel, setActivePanel] = useState<InkHomePanel>('home');
  const [playerName, setPlayerName] = useState('');
  const [lobbyCode, setLobbyCode] = useState('');

  const panelRefs = useRef<Record<InkHomePanel, HTMLDivElement | null>>({
    settings: null,
    home: null,
    friends: null,
  });

  const activeIndex = PANEL_ORDER.indexOf(activePanel);

  const goTo = useCallback(
    (next: InkHomePanel, source: 'arrow' | 'indicator' | 'swipe' | 'keyboard') => {
      if (next === activePanel) return;

      switch (source) {
        case 'arrow':
        case 'keyboard':
          playInkSound('brushTap', 0.4);
          break;
        case 'indicator':
          playInkSound('inkClick', 0.3);
          break;
        case 'swipe':
          playInkSound('inkTransition', 0.35);
          break;
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

  // Keyboard navigation
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

      const target = event.target as HTMLElement | null;
      if (target) {
        if (
          target.matches(
            'input, textarea, select, [contenteditable="true"]'
          ) ||
          target.closest(
            '[role="slider"], [role="combobox"], [role="listbox"], [role="menu"], [role="menuitem"], [role="option"], [role="spinbutton"], [role="tab"], [role="radio"]'
          )
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

  // Focus management
  const hasNavigatedRef = useRef(false);
  useEffect(() => {
    if (!hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      return;
    }
    const raf = requestAnimationFrame(() => {
      panelRefs.current[activePanel]?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
  }, [activePanel]);

  // Inert attribute on inactive panels
  useEffect(() => {
    PANEL_ORDER.forEach((panel) => {
      const node = panelRefs.current[panel];
      if (!node) return;
      if (panel === activePanel) {
        node.removeAttribute('inert');
      } else {
        node.setAttribute('inert', '');
      }
    });
  }, [activePanel]);

  // Swipe handling
  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const isTouch =
        (typeof TouchEvent !== 'undefined' && event instanceof TouchEvent) ||
        (event as PointerEvent).pointerType === 'touch';
      const threshold = isTouch ? 40 : 80;
      const horizontalDominant =
        Math.abs(info.offset.x) > Math.abs(info.offset.y);

      if (!horizontalDominant) return;

      if (info.offset.x < -threshold) {
        goNext('swipe');
      } else if (info.offset.x > threshold) {
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
        return <InkSettingsPanel isActive={activePanel === 'settings'} />;
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
      {/* 3D Perspective Container */}
      <motion.div
        className="relative flex-1 min-h-0 overflow-hidden"
        drag="x"
        dragDirectionLock={true}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {PANEL_ORDER.map((panel, idx) => {
          const position = getPanelPosition(idx, activeIndex);
          const variant = PANEL_VARIANTS[position];
          const isActive = panel === activePanel;

          return (
            <motion.div
              key={panel}
              className="absolute inset-0 flex items-center justify-center"
              animate={{
                x: variant.x,
                scale: variant.scale,
                rotateY: variant.rotateY,
                opacity: variant.opacity,
                zIndex: variant.zIndex,
                filter: variant.filter,
              }}
              transition={TRANSITION}
              style={{
                transformStyle: 'preserve-3d',
              }}
            >
              <div
                className={cn(
                  'w-full max-w-lg h-full rounded-2xl overflow-hidden',
                  isActive ? 'pointer-events-auto' : 'pointer-events-none'
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
                  className="h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-[#ff2b2b]/40 focus-visible:ring-offset-0 rounded-2xl"
                >
                  {renderPanelContent(panel)}
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Navigation arrows */}
        <motion.button
          type="button"
          onClick={() => goPrev('arrow')}
          disabled={isFirst}
          whileHover={isFirst ? undefined : { scale: 1.1 }}
          whileTap={isFirst ? undefined : { scale: 0.9 }}
          aria-label="Panneau précédent"
          className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2 z-40',
            'w-10 h-10 rounded-full flex items-center justify-center',
            'bg-black/80 border border-[#ff2b2b]/50',
            'transition-all duration-200',
            isFirst
              ? 'opacity-30 cursor-not-allowed'
              : 'opacity-100 hover:border-[#ff2b2b] hover:shadow-[0_0_15px_rgba(255,43,43,0.4)]'
          )}
          style={{ color: '#ff2b2b' }}
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>

        <motion.button
          type="button"
          onClick={() => goNext('arrow')}
          disabled={isLast}
          whileHover={isLast ? undefined : { scale: 1.1 }}
          whileTap={isLast ? undefined : { scale: 0.9 }}
          aria-label="Panneau suivant"
          className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2 z-40',
            'w-10 h-10 rounded-full flex items-center justify-center',
            'bg-black/80 border border-[#ff2b2b]/50',
            'transition-all duration-200',
            isLast
              ? 'opacity-30 cursor-not-allowed'
              : 'opacity-100 hover:border-[#ff2b2b] hover:shadow-[0_0_15px_rgba(255,43,43,0.4)]'
          )}
          style={{ color: '#ff2b2b' }}
        >
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </motion.div>

      {/* Dot indicators */}
      <div className="flex-shrink-0 flex items-center justify-center gap-3 py-3">
        {PANEL_ORDER.map((panel) => {
          const isActive = panel === activePanel;
          return (
            <button
              key={panel}
              type="button"
              onClick={() => goTo(panel, 'indicator')}
              aria-label={`Aller au panneau ${PANEL_LABELS[panel]}`}
              className={cn(
                'rounded-full transition-all duration-300',
                isActive
                  ? 'w-3 h-3'
                  : 'w-2 h-2 hover:opacity-80'
              )}
              style={
                isActive
                  ? {
                      background: '#ff2b2b',
                      boxShadow: '0 0 8px rgba(255,43,43,0.8), 0 0 16px rgba(255,43,43,0.4)',
                    }
                  : {
                      background: 'rgba(255,43,43,0.4)',
                    }
              }
            />
          );
        })}
      </div>
    </div>
  );
};

export const InkHomeCarousel = memo(InkHomeCarouselComponent);
