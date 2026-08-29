import { useCallback, useEffect, useRef, useState } from 'react';
import { playSample, playSustainedSample, type SustainedSample } from '@/lib/sfx/samples';

/**
 * Rendre une attente visible, sonore et honnête.
 *
 * Certaines étapes du jeu font un vrai travail — inverser un audio puis envoyer
 * deux fichiers, par exemple — mais ne montraient qu'une petite roue qui tourne
 * dans un bouton. Le joueur ne savait ni ce qui se passait, ni combien de temps
 * ça prendrait.
 *
 * La progression n'est jamais inventée :
 * - tant que la tâche tourne, la barre monte vers 92 % sur `minDurationMs` puis
 *   s'y arrête, au lieu d'afficher 100 % en mentant ;
 * - si la tâche finit avant, la barre termine quand même sa course pour que
 *   l'étape reste lisible plutôt que de clignoter ;
 * - si la tâche dure plus longtemps, on l'attend : l'animation ne la coupe
 *   jamais.
 */

/** Plafond affiché tant que la tâche n'a pas rendu la main. */
const PENDING_CEILING = 0.92;
/** Temps laissé à la barre pour rejoindre 100 % après la fin de la tâche. */
const SETTLE_MS = 300;
const TICK_MS = 60;

export interface StagedTaskState {
  isRunning: boolean;
  /** 0 à 1. */
  ratio: number;
  label: string;
}

export interface StagedRunOptions {
  /** Texte affiché pendant l'étape. */
  label: string;
  /** Durée minimale visible. En dessous, l'étape passerait inaperçue. */
  minDurationMs?: number;
  /** Échantillon joué en boucle pendant l'attente. */
  sound?: string;
  /** Échantillon joué une fois à la fin. */
  endSound?: string;
}

const IDLE: StagedTaskState = { isRunning: false, ratio: 0, label: '' };

export const useStagedTask = () => {
  const [state, setState] = useState<StagedTaskState>(IDLE);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<SustainedSample | null>(null);
  const mountedRef = useRef(true);

  const cleanup = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    soundRef.current?.stop();
    soundRef.current = null;
  }, []);

  // Un démontage pendant l'étape ne doit jamais laisser le son tourner.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  const run = useCallback(
    async <T,>(
      /**
       * La tâche reçoit un rapporteur d'étape. Une barre plafonnée à 92 % ne
       * mentait pas, mais elle ne disait pas non plus ce qu'elle attendait : au
       * bout de quelques secondes elle passait pour un blocage. Dire « inversion »
       * puis « envoi » coûte un mot et lève le doute.
       */
      task: (report: (label: string) => void) => Promise<T>,
      options: StagedRunOptions,
    ): Promise<T> => {
      const minDurationMs = Math.max(0, options.minDurationMs ?? 6_000);
      const startedAt = Date.now();
      let settledAt: number | null = null;

      cleanup();
      setState({ isRunning: true, ratio: 0, label: options.label });

      const report = (label: string) => {
        if (!mountedRef.current) return;
        setState((previous) => (previous.isRunning ? { ...previous, label } : previous));
      };
      if (options.sound) {
        soundRef.current = playSustainedSample(options.sound, 0.5);
      }

      timerRef.current = setInterval(() => {
        if (!mountedRef.current) return;
        const elapsed = Date.now() - startedAt;
        const total = settledAt === null
          ? minDurationMs
          : Math.max(minDurationMs, settledAt - startedAt + SETTLE_MS);
        const raw = total > 0 ? elapsed / total : 1;
        const ratio = settledAt === null
          ? Math.min(PENDING_CEILING, raw)
          : Math.min(1, raw);
        setState((previous) => (previous.isRunning ? { ...previous, ratio } : previous));
      }, TICK_MS);

      /** Laisse la barre finir sa course avant de rendre la main. */
      const waitForBar = async () => {
        const total = Math.max(minDurationMs, (settledAt ?? Date.now()) - startedAt + SETTLE_MS);
        const remaining = total - (Date.now() - startedAt);
        if (remaining > 0) await new Promise((done) => setTimeout(done, remaining));
      };

      try {
        const result = await task(report);
        settledAt = Date.now();
        await waitForBar();
        if (mountedRef.current && options.endSound) playSample(options.endSound, 0.5);
        return result;
      } catch (error) {
        // Un échec doit apparaître tout de suite : inutile de faire patienter le
        // joueur devant une barre qui n'aboutira à rien.
        throw error;
      } finally {
        cleanup();
        if (mountedRef.current) setState(IDLE);
      }
    },
    [cleanup],
  );

  return { state, run };
};
