import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSoundEffect } from '@/hooks/useSoundEffects';

interface CountdownOverlayProps {
  isActive: boolean;
  onComplete: () => void;
  duration?: number;
  title?: string;
  /** Local epoch translated from the authoritative server playback anchor. */
  completeAt?: number;
}

/* Trois secondes, trois teintes : on chauffe vers le départ. */
const COLORS = ['var(--ik-cyan, #34d399)', 'var(--ik-yellow, #f59e0b)', 'var(--ik-pink, #ef4444)'];

export const CountdownOverlay = ({
  isActive,
  onComplete,
  duration = 3,
  title = 'La vidéo commence dans…',
  completeAt,
}: CountdownOverlayProps) => {
  const [count, setCount] = useState(duration);
  const [isVisible, setIsVisible] = useState(false);
  const [started, setStarted] = useState(false);
  const [tick, setTick] = useState(0);
  /** Dernière seconde annoncée, pour ne réagir qu'aux vrais changements. */
  const lastCountRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  /*
   * Un seul point de vérité : la seconde restante, relevée sur l'échéance.
   *
   * La version précédente déclenchait `setTick` et le son *à l'intérieur* de
   * l'updater de `setCount`. Un updater doit être pur : React le rejoue, donc le
   * compteur changeait de clé plusieurs fois par seconde et le grand chiffre
   * restait bloqué en animation d'entrée — l'écran affichait le voile sans
   * jamais montrer le décompte. La comparaison passe maintenant par une réf,
   * hors du rendu.
   */
  useEffect(() => {
    if (!isActive) {
      setIsVisible(false);
      setStarted(false);
      lastCountRef.current = null;
      return;
    }

    let completed = false;
    const deadline = completeAt ?? Date.now() + duration * 1000;
    const remainingSeconds = () => Math.max(
      1,
      Math.min(duration, Math.ceil((deadline - Date.now()) / 1000)),
    );

    lastCountRef.current = remainingSeconds();
    setCount(lastCountRef.current);
    setTick(0);
    setIsVisible(true);
    setStarted(true);
    playSoundEffect('countdown', 0.5);

    const update = () => {
      if (completed) return;
      if (deadline - Date.now() <= 0) {
        completed = true;
        playSoundEffect('start', 0.6);
        setIsVisible(false);
        onCompleteRef.current();
        return;
      }

      const nextCount = remainingSeconds();
      if (lastCountRef.current === nextCount) return;
      lastCountRef.current = nextCount;
      setCount(nextCount);
      setTick((value) => value + 1);
      playSoundEffect('countdown', 0.5);
    };

    const timer = setInterval(update, 100);
    return () => {
      completed = true;
      clearInterval(timer);
    };
  }, [completeAt, duration, isActive]);

  if (!isVisible) return null;

  /* La dernière seconde prend la teinte la plus chaude, quelle que soit la durée. */
  const color = COLORS[Math.min(Math.max(duration - count, 0), COLORS.length - 1)];

  /*
   * Un seul bloc, un seul chiffre.
   *
   * L'ancien décompte empilait un voile flouté, une tache animée en boucle, des
   * coins graffiti, un anneau pulsant, une pastille emoji qui répétait le
   * chiffre et huit particules relancées à chaque seconde. Tout cela repeignait
   * le plein écran en continu, et le chiffre lui-même passait inaperçu. Ne reste
   * que ce qui porte l'information : le titre, le chiffre, les secondes.
   */
  return (
    <div className="ik-countdown" role="status" aria-live="assertive">
      <div className="ik-countdown-card">
        <p className="ik-countdown-title">{title}</p>

        <div className="ik-countdown-figure" style={{ ['--ik-countdown-tint' as string]: color }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={count}
              className="ik-countdown-number"
              initial={{ scale: 0.72, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.18, opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {count}
            </motion.span>
          </AnimatePresence>
        </div>

        <div className="ik-countdown-ticks" aria-hidden="true">
          {Array.from({ length: duration }).map((_, i) => (
            <span key={i} className={started && i >= count ? 'is-done' : undefined} />
          ))}
        </div>
      </div>
    </div>
  );
};
