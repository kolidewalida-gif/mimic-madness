/**
 * Déblocage de l'audio après un geste de l'utilisateur.
 *
 * Les navigateurs créent tout `AudioContext` à l'état `suspended` tant que la
 * page n'a pas reçu de geste. Le code appelait bien `resume()`, mais sans
 * jamais attendre la promesse ni retenter : quand le premier son était déclenché
 * hors d'un geste — un événement Realtime, un minuteur, un rendu — le contexte
 * restait suspendu **définitivement** et plus aucun effet sonore ne sortait, sans
 * le moindre message.
 *
 * Ce module tient le registre des contextes créés et les relance au premier
 * geste réel. Il sert aussi de point d'observation : `isAudioBlocked()` dit si
 * un contexte reste suspendu malgré un geste, ce qui n'est plus un problème de
 * code mais un réglage du navigateur ou du système.
 */

const contexts = new Set<AudioContext>();
let listening = false;
let sawGesture = false;

/** Événements que les navigateurs considèrent comme activant la page. */
const GESTURES: (keyof WindowEventMap)[] = [
  'pointerdown',
  'pointerup',
  'mousedown',
  'keydown',
  'touchstart',
  'touchend',
  'click',
];

const resumeAll = (): void => {
  for (const context of contexts) {
    if (context.state === 'closed') {
      contexts.delete(context);
      continue;
    }
    if (context.state === 'suspended') {
      void context.resume().catch(() => {
        // Refusé : le prochain geste retentera. Rien à signaler ici.
      });
    }
  }
};

const onGesture = (): void => {
  sawGesture = true;
  resumeAll();
};

const startListening = (): void => {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  // Jamais retirés : un contexte peut être créé bien après le premier geste, et
  // un contexte déjà repris coûte un test d'état par geste, rien de plus.
  GESTURES.forEach((name) => window.addEventListener(name, onGesture, { passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') resumeAll();
  });
};

/**
 * Enregistrer un contexte et le relancer dès que possible.
 *
 * À appeler juste après la création et avant de programmer le moindre son.
 */
export const registerAudioContext = (context: AudioContext): AudioContext => {
  contexts.add(context);
  startListening();
  if (context.state === 'suspended') {
    void context.resume().catch(() => {
      // Hors geste : la reprise se fera au prochain événement enregistré.
    });
  }
  return context;
};

/**
 * Vrai quand la page a reçu un geste et qu'un contexte reste malgré tout
 * suspendu. Dans ce cas la cause est extérieure au code : autorisation de
 * lecture automatique refusée pour le site, onglet coupé, ou périphérique de
 * sortie muet.
 */
export const isAudioBlocked = (): boolean => {
  if (!sawGesture) return false;
  for (const context of contexts) {
    if (context.state === 'suspended') return true;
  }
  return false;
};

/** Nombre de contextes suivis — utile pour repérer une fuite de contextes. */
export const trackedAudioContextCount = (): number => contexts.size;

/** Remet le module à zéro. Réservé aux tests. */
export const resetAudioUnlockForTests = (): void => {
  contexts.clear();
  sawGesture = false;
};
