/**
 * Effets sonores échantillonnés.
 *
 * Les effets du projet étaient tous synthétisés à l'oscillateur. Cette couche
 * joue à la place de vrais fichiers, générés une fois hors ligne par
 * `scripts/generate-sfx.mjs`. Elle se place **devant** la synthèse et ne fait
 * jamais échouer un appel : tout nom absent du manifeste, tout échantillon pas
 * encore chargé et tout appareil sans Web Audio retombent sur l'ancien
 * comportement. L'adoption se fait donc son par son, sans régression possible.
 *
 * Générer à l'exécution serait absurde ici : un son de clic est identique à
 * chaque fois, il doit partir en moins de 50 ms, et un appel réseau coûterait
 * des crédits à chaque clic.
 */
import { getSharedAudioContext, registerAudioContext } from '@/lib/audioUnlock';
import { getSoundEffectsVolume } from '@/hooks/useSoundEffectsVolume';
import manifest from './manifest.json';

interface SampleDefinition {
  id: string;
  /** Correction de niveau propre à l'échantillon, appliquée avant le volume global. */
  gain?: number;
  aliases: string[];
}

const SAMPLES: SampleDefinition[] = (manifest.samples as SampleDefinition[]) ?? [];

/** Nom utilisé dans le code → identifiant d'échantillon. */
const byAlias = new Map<string, SampleDefinition>();
for (const sample of SAMPLES) {
  byAlias.set(sample.id, sample);
  for (const alias of sample.aliases) byAlias.set(alias, sample);
}

type LoadState =
  | { status: 'ready'; buffer: AudioBuffer }
  | { status: 'loading' }
  | { status: 'missing' };

const cache = new Map<string, LoadState>();

const sampleUrl = (id: string): string => {
  const base = import.meta.env.BASE_URL ?? '/';
  return `${base.endsWith('/') ? base : `${base}/`}sfx/${id}.mp3`;
};

/**
 * Charge et décode un échantillon, une seule fois.
 *
 * Un échec est mémorisé comme `missing` : sans ça, chaque clic relancerait une
 * requête vouée à échouer tant que le fichier n'est pas généré.
 */
const load = async (sample: SampleDefinition): Promise<void> => {
  if (cache.has(sample.id)) return;
  cache.set(sample.id, { status: 'loading' });

  const context = getSharedAudioContext();
  if (!context) {
    cache.set(sample.id, { status: 'missing' });
    return;
  }

  try {
    const response = await fetch(sampleUrl(sample.id));
    if (!response.ok) {
      cache.set(sample.id, { status: 'missing' });
      return;
    }
    const encoded = await response.arrayBuffer();
    // `decodeAudioData` fonctionne même sur un contexte suspendu, donc le
    // préchargement n'a pas besoin d'attendre un geste de l'utilisateur.
    const buffer = await context.decodeAudioData(encoded);
    cache.set(sample.id, { status: 'ready', buffer });
  } catch {
    cache.set(sample.id, { status: 'missing' });
  }
};

/**
 * Joue un échantillon si l'on en a un de prêt.
 *
 * Renvoie `false` quand l'appelant doit se rabattre sur la synthèse : nom
 * inconnu, fichier absent, ou chargement encore en cours.
 */
export const playSample = (name: string, volume = 0.5): boolean => {
  const sample = byAlias.get(name);
  if (!sample) return false;

  const entry = cache.get(sample.id);
  if (!entry) {
    // Premier appel : on lance le chargement et on laisse la synthèse assurer
    // ce déclenchement-ci, pour ne jamais rendre un son silencieux.
    void load(sample);
    return false;
  }
  if (entry.status !== 'ready') return false;

  const context = getSharedAudioContext();
  if (!context) return false;
  if (context.state === 'suspended') registerAudioContext(context);

  try {
    const source = context.createBufferSource();
    source.buffer = entry.buffer;

    const gain = context.createGain();
    const level = volume * (sample.gain ?? 1) * getSoundEffectsVolume();
    // `NaN` ferait lever l'API Web Audio, et un volume négatif inverserait la
    // phase : on borne, comme pour la synthèse.
    gain.gain.value = Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0;

    source.connect(gain);
    gain.connect(context.destination);
    source.start();
    return true;
  } catch {
    return false;
  }
};

/** Précharge tous les échantillons du manifeste. */
export const prefetchSfxSamples = (): void => {
  for (const sample of SAMPLES) void load(sample);
};

/** Noms reconnus par la couche d'échantillons. Utile aux tests et au script. */
export const knownSampleNames = (): string[] => [...byAlias.keys()];

/** Identifiants d'échantillons attendus dans `public/sfx`. */
export const sampleIds = (): string[] => SAMPLES.map((sample) => sample.id);

/** Vide le cache. Réservé aux tests. */
export const resetSampleCacheForTests = (): void => {
  cache.clear();
};

// Préchargement opportuniste : les fichiers sont minuscules, et les avoir en
// mémoire avant le premier clic évite que ce clic sonne encore en synthèse.
if (typeof window !== 'undefined') {
  const start = () => {
    window.removeEventListener('pointerdown', start);
    window.removeEventListener('keydown', start);
    prefetchSfxSamples();
  };
  window.addEventListener('pointerdown', start, { passive: true, once: true });
  window.addEventListener('keydown', start, { passive: true, once: true });
  // Sans attendre un geste non plus : le réseau, lui, n'est pas soumis à
  // l'autorisation de lecture automatique.
  setTimeout(prefetchSfxSamples, 2_000);
}
