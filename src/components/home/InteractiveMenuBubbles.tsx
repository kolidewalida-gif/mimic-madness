import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { playMenuBubblePop } from '@/lib/menuBubbleSound';
import s from './InteractiveMenuBubbles.module.css';

const BUBBLES = [
  { x: 8, y: 24, size: 150, duration: 13, dx: 26, dy: -36 },
  { x: 86, y: 17, size: 82, duration: 11, dx: -22, dy: 32 },
  { x: 22, y: 73, size: 62, duration: 9, dx: -18, dy: -28 },
  { x: 94, y: 62, size: 168, duration: 15, dx: -30, dy: -40 },
  { x: 4, y: 85, size: 44, duration: 10, dx: 17, dy: -24 },
  { x: 75, y: 81, size: 52, duration: 12, dx: 20, dy: -31 },
  { x: 29, y: 13, size: 44, duration: 14, dx: -19, dy: 26 },
  { x: 70, y: 38, size: 46, duration: 10, dx: 23, dy: -20 },
  { x: 16, y: 55, size: 56, duration: 12, dx: -24, dy: 26 },
] as const;

const DROPS = Array.from({ length: 8 }, (_, index) => {
  const angle = index * Math.PI / 4;
  return { '--dx': `${Math.cos(angle) * 62}px`, '--dy': `${Math.sin(angle) * 62}px`, '--angle': `${index * 45}deg` } as CSSProperties;
});

/** CSS does the floating; React only updates on a pop/respawn, never each frame. */
export function InteractiveMenuBubbles({ active = true }: { active?: boolean }) {
  const [hidden, setHidden] = useState(() => document.visibilityState === 'hidden');
  const [popped, setPopped] = useState<Record<number, boolean>>({});
  const [generation, setGeneration] = useState<Record<number, number>>({});
  const [focusIndex, setFocusIndex] = useState(0);
  const locks = useRef(new Set<number>());
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const lastSound = useRef(-Infinity);
  const running = active && !hidden;

  useEffect(() => {
    const visibility = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', visibility);
    const pending = timers.current;
    return () => {
      document.removeEventListener('visibilitychange', visibility);
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
      playMenuBubblePop(bubble.size, bubble.x / 100, (generation[index] || 0) + index);
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

  return <div className={s.field} role="group" aria-label="Bulles à éclater" aria-hidden={!running || undefined} data-paused={!running}>
    {BUBBLES.map((bubble, index) => <div className={s.slot} key={index} data-popped={Boolean(popped[index])}
      style={{ '--x': `${bubble.x}%`, '--y': `${bubble.y}%`, '--size': `${bubble.size}px`, '--duration': `${bubble.duration}s`, '--delay': `${-index * 1.7}s`, '--drift-x': `${bubble.dx}px`, '--drift-y': `${bubble.dy}px` } as CSSProperties}>
      <button type="button" className={s.bubble} ref={element => { buttons.current[index] = element; }}
        aria-label={`Éclater la bulle ${index + 1}`} aria-disabled={Boolean(popped[index]) || !running}
        aria-description="Entrée ou espace pour éclater. Flèches pour changer de bulle."
        title="Pop !" tabIndex={running && focusIndex === index ? 0 : -1} disabled={!running}
        onFocus={() => setFocusIndex(index)} onKeyDown={event => navigate(event, index)} onClick={() => pop(index)}>
        <span className={s.skin} key={generation[index] || 0} aria-hidden="true" />
      </button>
      {popped[index] && <span className={s.burst} aria-hidden="true"><i className={s.ring} />{DROPS.map((style, drop) => <i className={s.drop} style={style} key={drop} />)}</span>}
    </div>)}
  </div>;
}
