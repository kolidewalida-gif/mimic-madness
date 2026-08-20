// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const mocks = vi.hoisted(() => ({
  getSoundEffectsVolume: vi.fn(() => 1),
}));

vi.mock('@/hooks/useSoundEffectsVolume', () => ({
  getSoundEffectsVolume: mocks.getSoundEffectsVolume,
}));

/** Contexte minimal : on observe le gain appliqué et les lectures déclenchées. */
class FakeContext {
  state: AudioContextState = 'running';
  destination = { id: 'destination' };
  started: number[] = [];
  gains: number[] = [];

  resume = vi.fn(() => Promise.resolve());
  decodeAudioData = vi.fn(async () => ({ duration: 0.5 }) as unknown as AudioBuffer);

  createBufferSource() {
    const self = this;
    return {
      buffer: null as AudioBuffer | null,
      connect: vi.fn(),
      start: vi.fn(() => self.started.push(Date.now())),
    };
  }

  createGain() {
    const self = this;
    const node = {
      gain: {
        _value: 0,
        get value() { return this._value; },
        set value(next: number) { this._value = next; self.gains.push(next); },
      },
      connect: vi.fn(),
    };
    return node;
  }
}

let context: FakeContext;
let playSample: typeof import('@/lib/sfx/samples').playSample;
let prefetchSfxSamples: typeof import('@/lib/sfx/samples').prefetchSfxSamples;
let knownSampleNames: typeof import('@/lib/sfx/samples').knownSampleNames;
let sampleIds: typeof import('@/lib/sfx/samples').sampleIds;

/** Attend que les chargements lancés en tâche de fond soient retombés. */
const flush = async () => {
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
};

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.getSoundEffectsVolume.mockReturnValue(1);

  context = new FakeContext();
  vi.stubGlobal('AudioContext', vi.fn(() => context) as unknown as typeof AudioContext);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => new ArrayBuffer(64),
    })),
  );

  const module = await import('@/lib/sfx/samples');
  playSample = module.playSample;
  prefetchSfxSamples = module.prefetchSfxSamples;
  knownSampleNames = module.knownSampleNames;
  sampleIds = module.sampleIds;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('couche d’échantillons', () => {
  it('laisse la synthèse assurer un nom inconnu', () => {
    // Aucun fichier ne doit être demandé pour un son resté synthétisé.
    expect(playSample('sonQuiNExistePas')).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('laisse la synthèse assurer le tout premier déclenchement', async () => {
    // Le fichier n'est pas encore décodé : mieux vaut l'ancien son qu'un silence.
    expect(playSample('click')).toBe(false);
    await flush();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('joue l’échantillon une fois chargé', async () => {
    playSample('click');
    await flush();

    expect(playSample('click')).toBe(true);
    expect(context.started).toHaveLength(1);
  });

  it('ne télécharge le fichier qu’une seule fois', async () => {
    playSample('click');
    await flush();
    playSample('click');
    playSample('click');
    await flush();

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('partage un fichier entre tous ses alias', async () => {
    // `click`, `inkClick` et `cartoonPop` désignent le même échantillon : le
    // thème Ink redirige les uns vers les autres.
    await prefetchSfxSamples();
    await flush();
    const before = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.length;

    expect(playSample('inkClick')).toBe(true);
    expect(playSample('cartoonPop')).toBe(true);
    expect((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(before);
  });

  it('applique le volume global des effets sonores', async () => {
    mocks.getSoundEffectsVolume.mockReturnValue(0.5);
    await prefetchSfxSamples();
    await flush();

    // `ui-hover` porte une correction de niveau de 0,7.
    playSample('hover', 1);
    expect(context.gains.at(-1)).toBeCloseTo(0.35);
  });

  it('borne un volume aberrant au lieu de faire lever l’API', async () => {
    await prefetchSfxSamples();
    await flush();

    mocks.getSoundEffectsVolume.mockReturnValue(Number.NaN);
    expect(playSample('click', 1)).toBe(true);
    expect(context.gains.at(-1)).toBe(0);

    mocks.getSoundEffectsVolume.mockReturnValue(10);
    playSample('click', 1);
    expect(context.gains.at(-1)).toBe(1);
  });

  it('retombe sur la synthèse et ne réessaie pas si le fichier manque', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));
    vi.resetModules();
    const module = await import('@/lib/sfx/samples');

    module.playSample('click');
    await flush();
    expect(module.playSample('click')).toBe(false);
    module.playSample('click');
    await flush();

    // Un échec mémorisé : sans ça chaque clic relancerait une requête vaine.
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('reprend un contexte suspendu avant de jouer', async () => {
    await prefetchSfxSamples();
    await flush();
    context.state = 'suspended';

    expect(playSample('click')).toBe(true);
    expect(context.resume).toHaveBeenCalled();
  });
});

describe('cohérence du manifeste avec les fichiers générés', () => {
  it('a un fichier MP3 valide pour chaque échantillon déclaré', () => {
    /*
     * Garde-fou concret : le manifeste et `public/sfx` doivent rester alignés.
     * Un identifiant déclaré sans fichier ferait silencieusement retomber le son
     * sur la synthèse, ce qui passerait inaperçu.
     */
    for (const id of sampleIds()) {
      const path = resolve(process.cwd(), 'public/sfx', `${id}.mp3`);
      expect(existsSync(path), `fichier manquant pour ${id}`).toBe(true);

      const head = readFileSync(path).subarray(0, 3);
      const isId3 = head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33;
      const isMpegSync = head[0] === 0xff;
      expect(isId3 || isMpegSync, `${id}.mp3 n'est pas un MP3`).toBe(true);
    }
  });

  it('ne déclare pas deux fois le même nom', () => {
    // Un alias en double rendrait la résolution dépendante de l'ordre.
    const names = knownSampleNames();
    expect(new Set(names).size).toBe(names.length);
  });

  it('couvre les sons les plus joués du projet', () => {
    const names = new Set(knownSampleNames());
    for (const expected of [
      'click', 'hover', 'success', 'error',
      'cartoonPop', 'brushTap', 'inkSuccess', 'inkClick', 'cartoonDing',
      'voteUp', 'voteDown',
    ]) {
      expect(names.has(expected), `alias absent : ${expected}`).toBe(true);
    }
  });
});
