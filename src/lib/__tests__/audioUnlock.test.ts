// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let registerAudioContext: typeof import('@/lib/audioUnlock').registerAudioContext;
let isAudioBlocked: typeof import('@/lib/audioUnlock').isAudioBlocked;
let trackedAudioContextCount: typeof import('@/lib/audioUnlock').trackedAudioContextCount;

/** Contexte minimal : `resume()` ne réussit que si un geste a eu lieu. */
class FakeContext {
  state: AudioContextState = 'suspended';
  resumeCalls = 0;
  /** Reproduit la politique des navigateurs : reprise refusée hors geste. */
  static gestureHappened = false;

  resume = vi.fn(() => {
    this.resumeCalls += 1;
    if (!FakeContext.gestureHappened) {
      return Promise.reject(new Error('not allowed'));
    }
    this.state = 'running';
    return Promise.resolve();
  });
}

const asContext = (fake: FakeContext) => fake as unknown as AudioContext;

const gesture = () => {
  FakeContext.gestureHappened = true;
  window.dispatchEvent(new Event('pointerdown'));
};

beforeEach(async () => {
  vi.resetModules();
  FakeContext.gestureHappened = false;
  const module = await import('@/lib/audioUnlock');
  registerAudioContext = module.registerAudioContext;
  isAudioBlocked = module.isAudioBlocked;
  trackedAudioContextCount = module.trackedAudioContextCount;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('déblocage audio', () => {
  it('relance un contexte suspendu au premier geste', async () => {
    /*
     * Régression vécue : le code appelait `resume()` sans attendre la promesse
     * et sans jamais retenter. Un contexte né hors geste — événement Realtime,
     * minuteur — restait suspendu pour toute la session, et plus aucun effet
     * sonore ne sortait, sans message.
     */
    const context = new FakeContext();
    registerAudioContext(asContext(context));

    // Hors geste, la reprise est refusée : le contexte reste suspendu.
    await Promise.resolve();
    expect(context.state).toBe('suspended');

    gesture();
    await Promise.resolve();
    expect(context.state).toBe('running');
  });

  it('relance tous les contextes connus, pas seulement le dernier', async () => {
    // Trois sous-systèmes d'effets sonores coexistent, chacun avec son contexte.
    const contexts = [new FakeContext(), new FakeContext(), new FakeContext()];
    contexts.forEach((context) => registerAudioContext(asContext(context)));
    expect(trackedAudioContextCount()).toBe(3);

    gesture();
    await Promise.resolve();
    expect(contexts.map((context) => context.state)).toEqual(['running', 'running', 'running']);
  });

  it('ne signale rien tant qu’aucun geste n’a eu lieu', () => {
    // Avant toute interaction, un contexte suspendu est normal, pas un blocage.
    registerAudioContext(asContext(new FakeContext()));
    expect(isAudioBlocked()).toBe(false);
  });

  it('signale un blocage quand un contexte résiste malgré un geste', async () => {
    const context = new FakeContext();
    registerAudioContext(asContext(context));

    // Geste reçu, mais la reprise reste refusée : la cause est extérieure au
    // code (autorisation du site, onglet coupé, sortie audio muette).
    window.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();

    expect(context.state).toBe('suspended');
    expect(isAudioBlocked()).toBe(true);
  });

  it('oublie les contextes fermés au lieu de les relancer', async () => {
    const context = new FakeContext();
    registerAudioContext(asContext(context));
    context.state = 'closed';

    gesture();
    await Promise.resolve();

    expect(trackedAudioContextCount()).toBe(0);
    expect(isAudioBlocked()).toBe(false);
  });

  it('n’empêche jamais l’appelant de continuer si la reprise échoue', () => {
    const context = new FakeContext();
    // Le retour doit être le contexte lui-même, utilisable immédiatement.
    expect(registerAudioContext(asContext(context))).toBe(asContext(context));
  });
});
