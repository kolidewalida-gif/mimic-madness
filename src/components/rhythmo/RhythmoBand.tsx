/**
 * Bande rythmo — the dubbing studio's scrolling text strip.
 *
 * Words scroll right-to-left at a *constant* speed past a fixed vertical
 * playhead. Constant speed is the whole point: distance becomes time, so the
 * player can see a word approaching and prepare it, instead of reading a
 * subtitle that appears all at once.
 *
 * Reads `videoRef.current.currentTime` on its own animation frame rather than
 * taking a `currentTime` prop. Two reasons: `onTimeUpdate` only fires ~4 times
 * a second, which is far too coarse for smooth scrolling, and driving this
 * from React state would re-render the whole strip 60 times a second. The
 * transform is written straight to the DOM node instead.
 */
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { cn } from '@/lib/utils';
import { flattenWords, type RhythmoTrack, type RhythmoWord } from '@/lib/rhythmo/types';
import {
  findActiveRhythmoWord,
  getRhythmoStripOffset,
  getRhythmoTimelineTime,
} from '@/lib/rhythmo/timeline';

interface RhythmoBandProps {
  track: RhythmoTrack | null;
  videoRef: RefObject<HTMLVideoElement>;
  /** Scroll speed. Higher shows less text but reads more calmly. */
  pxPerSecond?: number;
  /** Playhead position as a fraction of the strip width. */
  playheadRatio?: number;
  /** Seconds of visual lead over the video's media clock. */
  leadSeconds?: number;
  /** Accent used for the playhead and the active word. */
  accent?: string;
  className?: string;
}

/** Layout of one word on the strip, precomputed once per track. */
interface PlacedWord extends RhythmoWord {
  left: number;
  minWidth: number;
}

const RhythmoBandComponent = ({
  track,
  videoRef,
  pxPerSecond = 132,
  playheadRatio = 0.32,
  leadSeconds = 0,
  accent = 'var(--c-violet)',
  className,
}: RhythmoBandProps) => {
  const stripRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);
  /** Index of the word under the playhead, mirrored in the DOM via classes. */
  const activeRef = useRef<number>(-1);
  const wordNodesRef = useRef<(HTMLSpanElement | null)[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);

  const words = useMemo(() => flattenWords(track), [track]);

  const placed = useMemo<PlacedWord[]>(
    () =>
      words.map((word) => ({
        ...word,
        left: word.start * pxPerSecond,
        // Give each word at least the width of its own duration so the strip
        // stays a faithful timeline even for very short words.
        minWidth: Math.max(0, (word.end - word.start) * pxPerSecond),
      })),
    [words, pxPerSecond],
  );

  const totalWidth = useMemo(() => {
    if (placed.length === 0) return 0;
    const last = placed[placed.length - 1];
    return last.left + Math.max(last.minWidth, 120) + 240;
  }, [placed]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (placed.length === 0) return;

    const tick = () => {
      const video = videoRef.current;
      const strip = stripRef.current;
      const viewport = viewportRef.current;

      if (video && strip && viewport) {
        const timelineTime = getRhythmoTimelineTime(video.currentTime, leadSeconds);
        const playhead = viewport.clientWidth * playheadRatio;

        // Written directly to the node: this runs every frame and must not
        // trigger a React render. Position, highlighting and past state all
        // use the exact same media-derived clock.
        const stripOffset = getRhythmoStripOffset(playhead, timelineTime, pxPerSecond);
        strip.style.transform = `translate3d(${stripOffset}px,0,0)`;

        const next = findActiveRhythmoWord(placed, timelineTime, activeRef.current);
        if (next !== activeRef.current) {
          const previousNode = wordNodesRef.current[activeRef.current];
          previousNode?.classList.remove('is-live');
          const nextNode = wordNodesRef.current[next];
          nextNode?.classList.add('is-live');
          activeRef.current = next;
        }

        // Past words stay dimmed so the player sees what is already gone.
        for (let i = 0; i < placed.length; i += 1) {
          const node = wordNodesRef.current[i];
          if (!node) continue;
          const isPast = timelineTime > placed[i].end;
          if (isPast !== node.classList.contains('is-past')) {
            node.classList.toggle('is-past', isPast);
          }
        }
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [placed, videoRef, pxPerSecond, playheadRatio, leadSeconds]);

  if (!track || placed.length === 0) return null;

  return (
    <div
      className={cn('rb-root', className)}
      style={{ ['--rb-accent' as string]: accent }}
      // Decorative mirror of the audio: the transcript is also exposed as
      // plain text below for anyone who cannot follow a moving strip.
      aria-hidden="true"
    >
      <div className="rb-viewport" ref={viewportRef}>
        <div
          className="rb-strip"
          ref={stripRef}
          style={{ width: totalWidth || undefined }}
        >
          {/* Baseline: makes the constant speed legible as a distance. */}
          <span className="rb-baseline" />

          {placed.map((word, index) => (
            <span
              key={`${index}-${word.start}`}
              ref={(node) => {
                wordNodesRef.current[index] = node;
              }}
              className="rb-word"
              style={{ left: word.left, minWidth: word.minWidth }}
            >
              {word.text}
              <span className="rb-word-span" />
            </span>
          ))}
        </div>

        {/* Fixed playhead — the line words must be spoken on. */}
        <span className="rb-playhead" style={{ left: `${playheadRatio * 100}%` }} />

        {/* Edge fades, so words enter and leave instead of popping. */}
        <span className="rb-fade rb-fade--left" />
        <span className="rb-fade rb-fade--right" />
      </div>

      {reducedMotion && (
        <p className="rb-static">
          {track.cues.map((cue) => cue.text).join(' · ')}
        </p>
      )}
    </div>
  );
};

export const RhythmoBand = memo(RhythmoBandComponent);
