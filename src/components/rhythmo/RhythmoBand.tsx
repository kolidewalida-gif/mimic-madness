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
  placeRhythmoWords,
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

/**
 * Taille de police des mots de la bande, en pixels.
 *
 * Doit rester alignée avec `.rb-word` dans `index.css` : elle sert à estimer la
 * largeur d'un mot pour éviter que deux mots se recouvrent.
 */
const WORD_FONT_SIZE_PX = 24;

const RhythmoBandComponent = ({
  track,
  videoRef,
  // Plus d'espace par seconde : à 132 px/s la parole courante tassait les mots,
  // ce qui obligeait à les décaler beaucoup pour éviter les collisions et
  // éloignait donc le mot actif de la ligne de lecture.
  pxPerSecond = 190,
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
  /** Nombre de mots déjà marqués comme passés, en partant du début. */
  const pastCountRef = useRef<number>(0);
  const wordNodesRef = useRef<(HTMLSpanElement | null)[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);

  const words = useMemo(() => flattenWords(track), [track]);

  const placed = useMemo<PlacedWord[]>(() => {
    // Le placement décale un mot juste assez pour qu'il ne recouvre pas le
    // précédent : à plus de trois mots par seconde, la seule position
    // temporelle faisait se chevaucher les mots et la bande devenait illisible.
    const layout = placeRhythmoWords(words, pxPerSecond, WORD_FONT_SIZE_PX);
    return words.map((word, index) => ({
      ...word,
      left: layout[index].left,
      minWidth: layout[index].width,
    }));
  }, [words, pxPerSecond]);

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

    /**
     * Le défilement n'est PAS décoratif : c'est lui qui porte l'information de
     * timing, il indique quoi dire et à quel instant. Le suspendre sous
     * `prefers-reduced-motion` figeait la bande sur les premiers mots et rendait
     * le mode imitation injouable — l'équivalent de masquer des sous-titres.
     *
     * La préférence est honorée là où elle a du sens : les transitions
     * décoratives par mot sont neutralisées par la règle globale du CSS, et la
     * transcription complète est affichée en complément sous la bande. Le
     * critère « pouvoir mettre en pause » est satisfait par les contrôles de la
     * vidéo, puisque la bande suit `video.currentTime`.
     */
    // Nouveau montage ou nouvelle piste : les repères de l'ancienne n'ont plus
    // de sens et feraient repartir la recherche depuis un index périmé.
    activeRef.current = -1;
    pastCountRef.current = 0;

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

        /**
         * Les mots passés restent estompés pour montrer ce qui est déjà dit.
         *
         * Seule la frontière est déplacée, au lieu de reparcourir la liste à
         * chaque image : une transcription de trois minutes fait plusieurs
         * centaines de mots, ce qui donnait des dizaines de milliers de lectures
         * de `classList` par seconde pour ne changer qu'un mot. Les deux boucles
         * gèrent aussi le retour arrière après un déplacement dans la vidéo.
         */
        let count = pastCountRef.current;
        while (count < placed.length && timelineTime > placed[count].end) {
          wordNodesRef.current[count]?.classList.add('is-past');
          count += 1;
        }
        while (count > 0 && timelineTime <= placed[count - 1].end) {
          count -= 1;
          wordNodesRef.current[count]?.classList.remove('is-past');
        }
        pastCountRef.current = count;
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

      {/* Complément, pas remplacement : la bande continue de défiler, et le
          texte complet est offert en plus à qui préfère un support fixe. */}
      {reducedMotion && (
        <p className="rb-static">
          {track.cues.map((cue) => cue.text).join(' · ')}
        </p>
      )}
    </div>
  );
};

export const RhythmoBand = memo(RhythmoBandComponent);
