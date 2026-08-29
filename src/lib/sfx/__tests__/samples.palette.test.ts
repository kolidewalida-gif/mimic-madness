// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSoundEffectsVolume: vi.fn(() => 1),
}));

vi.mock('@/hooks/useSoundEffectsVolume', () => ({
  getSoundEffectsVolume: mocks.getSoundEffectsVolume,
}));

/**
 * Contexte complet, contrairement à celui de `samples.test.ts`.
 *
 * Celui-là vérifie que la mise en forme par mode arrive bien jusqu'au graphe :
 * hauteur de lecture, filtre, limiteur. Il faut donc modéliser les nœuds que la
 * chaîne peut créer, là où l'autre test se contente du strict nécessaire — et
 * couvre par là même le cas d'un contexte partiel.
 */
class RichContext {
  state: AudioContextState = 'running';
  destination = { id: 'destination' };
  rates: number[] = [];
  filters: Array<{ type: string; frequency: number; q: number }> = [];
  gains: number[] = [];
  limiters = 0;
  started = 0;

  resume = vi.fn(() => Promise.resolve());
  decodeAudioData = vi.fn(async () => ({ duration: 0.5 }) as unknown as AudioBuffer);

  createBufferSource() {
    const self = this;
    return {
      buffer: null as AudioBuffer | null,
      playbackRate: {
        _value: 1,
        get value() { return this._value; },
        set value(next: number) { this._value = next; self.rates.push(next); },
      },
      connect: vi.fn(),
      start: vi.fn(() => { self.started += 1; }),
    };
  }

  createBiquadFilter() {
    const self = this;
    const entry = { type: 'lowpass', frequency: 0, q: 0 };
    self.filters.push(entry);
    return {
      set type(next: string) { entry.type = next; },
      get type() { return entry.type; },
      frequency: { set value(next: number) { entry.frequency = next; } },
      Q: { set value(next: number) { entry.q = next; } },
      connect: vi.fn(),
    };
  }

  createGain() {
    const self = this;
    return {
      gain: {
        _value: 0,
        get value() { return this._value; },
        set value(next: number) { this._value = next; self.gains.push(next); },
      },
      connect: vi.fn(),
    };
  }

  createDynamicsCompressor() {
    this.limiters += 1;
    return {
      threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 },
      attack: { value: 0 }, release: { value: 0 },
      connect: vi.fn(),
    };
  }
}

let context: RichContext;
let samples: typeof import('@/lib/sfx/samples');
let palette: typeof import('@/lib/sfx/palette');

const flush = async () => {
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
};

/** Charge et décode un échantillon pour que la lecture suivante soit réelle. */
const prime = async (name: string) => {
  samples.playSample(name);
  await flush();
};

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.getSoundEffectsVolume.mockReturnValue(1);

  context = new RichContext();
  vi.stubGlobal('AudioContext', vi.fn(() => context) as unknown as typeof AudioContext);
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(64),
  })));

  samples = await import('@/lib/sfx/samples');
  palette = await import('@/lib/sfx/palette');
});

afterEach(() => {
  palette.resetSfxModeForTests();
  vi.unstubAllGlobals();
});

describe('la palette du mode atteint le graphe audio', () => {
  it('transpose le son selon le mode', async () => {
    await prime('click');

    palette.setActiveSfxMode('monopoly');
    expect(samples.playSample('click')).toBe(true);
    expect(context.rates.at(-1)).toBeCloseTo(palette.paletteFor('monopoly').rate);

    palette.setActiveSfxMode('pixoguess');
    samples.playSample('click');
    expect(context.rates.at(-1)).toBeCloseTo(palette.paletteFor('pixoguess').rate);
  });

  it('ne touche pas la hauteur quand la palette est à l’unisson', async () => {
    await prime('click');
    palette.setActiveSfxMode('normal');
    samples.playSample('click');
    // `normal` est à 1 : inutile d'écrire dans `playbackRate`.
    expect(context.rates).toHaveLength(0);
  });

  it('installe le filtre décrit par la palette', async () => {
    await prime('click');

    palette.setActiveSfxMode('audiophone');
    samples.playSample('click');

    const applied = context.filters.at(-1);
    const expected = palette.paletteFor('audiophone').filter!;
    expect(applied).toEqual({
      type: expected.type,
      frequency: expected.frequency,
      q: expected.q,
    });
  });

  it('applique la correction de niveau du mode', async () => {
    await prime('click');

    palette.setActiveSfxMode('undercover');
    samples.playSample('click', 1);
    const hushed = context.gains.at(-1)!;

    palette.setActiveSfxMode('normal');
    samples.playSample('click', 1);
    const plain = context.gains.at(-1)!;

    // Undercover doit rester en retrait : c'est le ton du mode.
    expect(hushed).toBeLessThan(plain);
  });

  it('borne toujours le niveau, palette comprise', async () => {
    await prime('click');
    mocks.getSoundEffectsVolume.mockReturnValue(10);
    palette.setActiveSfxMode('audiophone');
    samples.playSample('click', 1);
    expect(context.gains.at(-1)).toBe(1);
  });

  it('insère un limiteur pour éviter la saturation', async () => {
    /*
     * La couche d'échantillons n'en avait aucun, alors que le banc Ink en a un :
     * deux sons superposés saturaient, ce qui s'entend comme une dureté.
     */
    await prime('click');
    samples.playSample('click');
    expect(context.limiters).toBeGreaterThan(0);
  });

  it('joue l’échantillon dédié du mode quand il y en a un', async () => {
    // En quiz, `success` doit atteindre `quiz-correct`, pas le ding générique.
    palette.setActiveSfxMode('quiz');
    samples.playSample('success');
    await flush();

    const urls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
      .map((call) => String(call[0]));
    expect(urls.some((url) => url.endsWith('/sfx/quiz-correct.wav'))).toBe(true);
    expect(urls.some((url) => url.endsWith('/sfx/ui-success.wav'))).toBe(false);
  });
});
