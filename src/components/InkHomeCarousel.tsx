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

      // One sound per gesture. We dropped the extra `inkSuccess` accent on
      // landing on a side panel because it stacked on top of the source sound
      // (review issue #4).
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

  // Keyboard navigation: ArrowLeft / ArrowRight. Skip if focus is in a text
  // input, textarea, contenteditable element, or any ARIA widget that
  // consumes arrow keys (Radix Slider, Select, Combobox, etc.). Without this
  // the volume Sliders and the device-picker Selects would also switch
  // panels (review issue #1).
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

  // Focus management: move focus to the active panel after each user-driven
  // switch. We skip the initial mount so the auto-opening (untrapped) patch
  // note modal isn't fighting the panel root for focus (review issue #5).
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

  // Toggle the `inert` attribute on inactive panels so their descendants are
  // removed from the sequential focus order, blocked from pointer events, and
  // hidden from assistive tech as a single switch (review issue #2). We set
  // it imperatively because React 18 standard typings don't expose `inert` as
  // a JSX prop yet.
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
  }, [activePanel, trackWidth]);

  // Swipe threshold differs by pointer type: a small diagonal mouse drag onto
  // a button shouldn't yank the carousel and eat the click (review issue #7).
  // Touch keeps the original 40px threshold; mouse/pen requires 80px and
  // a horizontal-dominant gesture.
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
      {/* Track - 3D Carousel Container */}
      <div
        ref={trackRef}
        className="relative flex-1 min-h-0 overflow-hidden"
        style={{ perspective: '1200px' }}
      >
        {/* Panels - Absolute positioning with 3D transforms */}
        <div className="absolute inset-0 flex items-center justify-center">
          {PANEL_ORDER.map((panel, idx) => {
            const isActive = panel === activePanel;
            const offset = idx - activeIndex;
            
            // Calculate transforms for 3D carousel effect
            const getTransform = () => {
              if (offset === 0) {
                // Active panel - center, full size
                return {
                  x: 0,
                  scale: 1,
                  opacity: 1,
                  rotateY: 0,
                  z: 0,
                  filter: 'blur(0px)',
                };
              } else if (offset === -1) {
                // Left panel
                return {
                  x: isMobile ? '-85%' : '-75%',
                  scale: 0.75,
                  opacity: 0.35,
                  rotateY: 25,
                  z: -200,
                  filter: 'blur(1px)',
                };
              } else if (offset === 1) {
                // Right panel
                return {
                  x: isMobile ? '85%' : '75%',
                  scale: 0.75,
                  opacity: 0.35,
                  rotateY: -25,
                  z: -200,
                  filter: 'blur(1px)',
                };
              } else {
                // Hidden panels
                return {
                  x: offset < 0 ? '-150%' : '150%',
                  scale: 0.6,
                  opacity: 0,
                  rotateY: offset < 0 ? 45 : -45,
                  z: -400,
                  filter: 'blur(2px)',
                };
              }
            };

            const transform = getTransform();

            return (
              <motion.div
                key={panel}
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  pointerEvents: isActive ? 'auto' : 'none',
                  zIndex: isActive ? 10 : offset === 0 ? 10 : 5 - Math.abs(offset),
                }}
                animate={{
                  x: transform.x,
                  scale: transform.scale,
                  opacity: transform.opacity,
                  rotateY: transform.rotateY,
                  z: transform.z,
                  filter: transform.filter,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 35,
                  mass: 0.8,
                }}
              >
                <div
                  className={cn(
                    'w-full max-w-2xl h-full rounded-2xl overflow-hidden',
                    'transition-shadow duration-300',
                    isActive
                      ? 'border-2 border-primary/40'
                      : 'border border-primary/20'
                  )}
                  style={{
                    transformStyle: 'preserve-3d',
                    boxShadow: isActive 
                      ? '0 0 60px hsl(var(--primary) / 0.4), 0 0 100px hsl(var(--primary) / 0.2)'
                      : '0 0 20px rgba(0,0,0,0.3)',
                  }}
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
                </div>
              </motion.div>
            );
          })}
        </div>

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
