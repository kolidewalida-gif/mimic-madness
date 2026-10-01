import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { playMenuBubblePop } from '@/lib/menuBubbleSound';
import { animateMenuBubbles } from '@/lib/menuBubbleMotion';
import s from './InteractiveMenuBubbles.module.css';

const BUBBLES = [
  { x: 8, y: 24, size: 150 },
  { x: 86, y: 17, size: 82 },
  { x: 22, y: 73, size: 62 },
  { x: 94, y: 62, size: 168 },
  { x: 4, y: 85, size: 44 },
  { x: 75, y: 81, size: 52 },
  { x: 29, y: 13, size: 44 },
  { x: 70, y: 38, size: 46 },
  { x: 16, y: 55, size: 56 },
] as const;

const DROPS = Array.from({ length: 8 }, (_, index) => {
  const angle = index * Math.PI / 4;
  return { '--dx': `${Math.cos(angle) * 62}px`, '--dy': `${Math.sin(angle) * 62}px`, '--angle': `${index * 45}deg` } as CSSProperties;
});

/** Compositor-driven wandering; React only updates interaction state. */
export function InteractiveMenuBubbles({ active = true }: { active?: boolean }) {
  const [hidden, setHidden] = useState(() => document.visibilityState === 'hidden');
  const [popped, setPopped] = useState<Record<number, boolean>>({});
  const [generation, setGeneration] = useState<Record<number, number>>({});
  const [focusIndex, setFocusIndex] = useState(0);
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);
  const locks = useRef(new Set<number>());
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const lastSound = useRef(-Infinity);
  const field = useRef<HTMLDivElement | null>(null);
  const running = active && !hidden;

  useEffect(() => {
    if (!field.current) return;
    return animateMenuBubbles(field.current, buttons.current.flatMap(button => button?.parentElement ? [button.parentElement] : []));
  }, []);

  useEffect(() => {
    const visibility = () => {
      setHidden(document.visibilityState === 'hidden');
      setPressedIndex(null);
    };
    const pageHide = () => { setHidden(true); setPressedIndex(null); };
    document.addEventListener('visibilitychange', visibility);
    // Safari can restore a frozen page without remounting React or dispatching
    // visibilitychange. Re-enable the controls when the page is restored.
    window.addEventListener('pageshow', visibility);
    window.addEventListener('pagehide', pageHide);
    const pending = timers.current;
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pageshow', visibility);
      window.removeEventListener('pagehide', pageHide);
      pending.forEach(timer => clearTimeout(timer)); pending.clear();
    };
  }, []);

  const pop = (index: number) => {
    if (!running || locks.current.has(index) || document.visibilityState === 'hidden') return;
    locks.current.add(index);
    setPopped(previous => ({ ...previous, [index]: true }));
    const bubble = BUBBLES[index];
    const now = performance.now();
    // Clicking several bubbles stays responsive without stacking loud transients.
    if (now - lastSound.current >= 70) {
      lastSound.current = now;
      const rect = buttons.current[index]?.getBoundingClientRect();
      const pan = rect && rect.width ? (rect.left + rect.width / 2) / window.innerWidth : bubble.x / 100;
      playMenuBubblePop(bubble.size, pan, (generation[index] || 0) + index);
    }
    timers.current.set(index, setTimeout(() => {
      locks.current.delete(index); timers.current.delete(index);
      setGeneration(previous => ({ ...previous, [index]: (previous[index] || 0) + 1 }));
      setPopped(previous => ({ ...previous, [index]: false }));
    }, 2200 + index % 4 * 330));
  };

  const navigate = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 0;
    if (!direction || !running) return;
    event.preventDefault(); event.stopPropagation();
    const next = (index + direction + BUBBLES.length) % BUBBLES.length;
    setFocusIndex(next); buttons.current[next]?.focus();
  };

  return <div ref={field} className={s.field} role="group" aria-label="Bulles à éclater" aria-hidden={!running || undefined} data-paused={!running}>
    {BUBBLES.map((bubble, index) => <div className={s.slot} key={index} data-popped={Boolean(popped[index])} data-pressed={pressedIndex === index}
      style={{ '--x': `${bubble.x}%`, '--y': `${bubble.y}%`, '--size': `${bubble.size}px` } as CSSProperties}>
      <button type="button" className={s.bubble} ref={element => { buttons.current[index] = element; }}
        aria-label={`Éclater la bulle ${index + 1}`} aria-disabled={Boolean(popped[index]) || !running}
        aria-description="Entrée ou espace pour éclater. Flèches pour changer de bulle."
        title="Pop !" tabIndex={running && focusIndex === index ? 0 : -1} disabled={!running}
        onPointerDown={event => { if (event.button === 0 && running) setPressedIndex(index); }}
        onPointerUp={() => setPressedIndex(null)} onPointerCancel={() => setPressedIndex(null)} onPointerLeave={() => setPressedIndex(null)}
        onFocus={() => setFocusIndex(index)} onKeyDown={event => navigate(event, index)} onClick={() => pop(index)}>
        <span className={s.skin} key={generation[index] || 0} aria-hidden="true" />
      </button>
      {popped[index] && <span className={s.burst} aria-hidden="true"><i className={s.ring} />{DROPS.map((style, drop) => <i className={s.drop} style={style} key={drop} />)}</span>}
    </div>)}
  </div>;
}
