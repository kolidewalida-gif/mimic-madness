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

    /*
     * L'invariant est « volume demandé × correction de l'échantillon × volume
     * global ». La correction est lue dans le manifeste : la coder en dur
     * casserait le test à chaque réglage du mixage.
     */
    const manifest = JSON.parse(
      readFileSync(resolve(process.cwd(), 'src/lib/sfx/manifest.json'), 'utf8')
        .replace(/^\uFEFF/, ''),
    );
    const hoverGain = manifest.samples.find(
      (sample: { id: string }) => sample.id === 'ui-hover',
    ).gain;

    playSample('hover', 1);
    expect(context.gains.at(-1)).toBeCloseTo(hoverGain * 0.5);
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
  it('a un fichier WAV valide et silencieux aux deux bouts pour chaque échantillon', () => {
    /*
     * Garde-fou concret : le manifeste et `public/sfx` doivent rester alignés.
     * Un identifiant déclaré sans fichier ferait silencieusement retomber le son
     * sur la synthèse, ce qui passerait inaperçu.
     *
     * On vérifie aussi les bords. Un échantillon qui commence ou finit à
     * amplitude non nulle produit un claquement à chaque déclenchement : c'est
     * le défaut le plus audible d'une banque d'interface, et le seul qu'on
     * puisse attraper sans écouter.
     */
    for (const id of sampleIds()) {
      const path = resolve(process.cwd(), 'public/sfx', `${id}.wav`);
      expect(existsSync(path), `fichier manquant pour ${id}`).toBe(true);

      const file = readFileSync(path);
      expect(file.subarray(0, 4).toString('ascii'), `${id}.wav sans en-tête RIFF`).toBe('RIFF');
      expect(file.subarray(8, 12).toString('ascii'), `${id}.wav n'est pas du WAVE`).toBe('WAVE');
      expect(file.readUInt16LE(22), `${id}.wav n'est pas mono`).toBe(1);
      expect(file.readUInt16LE(34), `${id}.wav n'est pas en 16 bits`).toBe(16);

      /* Premier et dernier échantillon, en valeur absolue sur 32767. */
      const dataStart = 44;
      const first = Math.abs(file.readInt16LE(dataStart));
      const last = Math.abs(file.readInt16LE(file.length - 2));
      expect(first, `${id}.wav démarre à ${first}, donc il claque`).toBeLessThan(64);
      expect(last, `${id}.wav se coupe à ${last}, donc il claque`).toBeLessThan(64);
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

  it('couvre les invitations et le chat', () => {
    // Ces événements empruntaient des sons sans rapport : le carillon des succès
    // débloqués pour une invitation reçue, le son de clic pour un message.
    const names = new Set(knownSampleNames());
    for (const expected of [
      'inviteReceived', 'inviteSent', 'inviteAccepted', 'inviteDeclined',
      'messageSend', 'messageReceive',
    ]) {
      expect(names.has(expected), `alias absent : ${expected}`).toBe(true);
    }
  });

  it('couvre chaque mode de jeu et l’étape de traitement', () => {
    /*
     * Les noms de mode sont dérivés du mode dans `Index.handleStartGame`
     * (`mode` + capitale). Un mode sans son y retomberait sur le `start`
     * générique, ce qui passerait inaperçu.
     */
    const names = new Set(knownSampleNames());
    for (const mode of [
      'normal', '2v2', 'quiz', 'audiophone', 'pixoguess',
      'monopoly', 'undercover', 'memorise', 'mimic',
    ]) {
      const alias = `mode${mode.charAt(0).toUpperCase()}${mode.slice(1)}`;
      expect(names.has(alias), `son de mode absent : ${alias}`).toBe(true);
    }
    for (const expected of ['processRewind', 'processLoading', 'processDone']) {
      expect(names.has(expected), `alias absent : ${expected}`).toBe(true);
    }
  });

  it('donne aux sons d’attente une durée suffisante pour être bouclés', () => {
    // Un son d'attente trop court s'entendrait boucler pendant les 6 s d'étape.
    const manifest = JSON.parse(
      readFileSync(resolve(process.cwd(), 'src/lib/sfx/manifest.json'), 'utf8')
        .replace(/^\uFEFF/, ''),
    );
    for (const id of ['process-rewind', 'process-loading']) {
      const sample = manifest.samples.find((s: { id: string }) => s.id === id);
      expect(sample.durationSeconds, `${id} trop court`).toBeGreaterThanOrEqual(5);
    }
  });
});
