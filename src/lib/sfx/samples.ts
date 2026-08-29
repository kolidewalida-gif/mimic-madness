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
import { activePalette, resolveSampleName } from './palette';
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

/**
 * Le banc est en WAV 24 kHz mono.
 *
 * Il était en MP3, sorti d'un service génératif. Il est maintenant synthétisé
 * par `scripts/synth-sfx.mjs`, qui écrit du PCM : pas d'encodeur à embarquer,
 * pas de perte, et un contrôle direct du timbre. À 24 kHz mono, un son
 * d'interface pèse une vingtaine de kilo-octets — l'écart avec le MP3 ne se voit
 * pas sur des fichiers aussi courts, et ils sont mis en cache une fois.
 */
const sampleUrl = (id: string): string => {
  const base = import.meta.env.BASE_URL ?? '/';
  return `${base.endsWith('/') ? base : `${base}/`}sfx/${id}.wav`;
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
/**
 * Assemble la chaîne de lecture d'un échantillon selon la palette du mode.
 *
 * Chaque maillon optionnel est précédé d'un test d'existence. Ce module a pour
 * contrat de ne jamais faire échouer un son : sur un contexte partiel — un
 * doublon de test, un navigateur exotique — la chaîne se réduit d'elle-même au
 * strict nécessaire au lieu de lever.
 *
 * L'ordre compte : le gain de niveau est créé en DERNIER, car c'est lui qui
 * porte l'invariant de volume vérifié par les tests.
 */
const buildChain = (
  context: AudioContext,
  buffer: AudioBuffer,
  level: number,
): AudioBufferSourceNode => {
  const palette = activePalette();

  const source = context.createBufferSource();
  source.buffer = buffer;
  // La hauteur : un clic plus grave devient mat, plus aigu il devient précis.
  if (source.playbackRate && palette.rate !== 1) {
    source.playbackRate.value = palette.rate;
  }

  // Le timbre. Absent d'un contexte partiel : on s'en passe sans bruit.
  let tail: AudioNode = source;
  if (palette.filter && typeof context.createBiquadFilter === 'function') {
    const filter = context.createBiquadFilter();
    filter.type = palette.filter.type;
    filter.frequency.value = palette.filter.frequency;
    filter.Q.value = palette.filter.q;
    tail.connect(filter);
    tail = filter;
  }

  const gain = context.createGain();
  gain.gain.value = Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0;
  tail.connect(gain);

  /*
   * Limiteur doux en sortie. Le banc Ink en a un depuis toujours, la couche
   * d'échantillons n'en avait aucun : deux sons superposés pouvaient donc
   * saturer, ce qui s'entend comme une dureté et fatigue vite. C'est le maillon
   * qui rend l'ensemble agréable, plus que n'importe quel réglage de timbre.
   */
  if (typeof context.createDynamicsCompressor === 'function') {
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 8;
    limiter.ratio.value = 4;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.12;
    gain.connect(limiter);
    limiter.connect(context.destination);
  } else {
    gain.connect(context.destination);
  }

  return source;
};

export const playSample = (name: string, volume = 0.5): boolean => {
  // Le mode courant peut préférer un autre échantillon existant pour ce nom.
  const sample = byAlias.get(resolveSampleName(name)) ?? byAlias.get(name);
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
    // `NaN` ferait lever l'API Web Audio, et un volume négatif inverserait la
    // phase : on borne, comme pour la synthèse.
    const level = volume * (sample.gain ?? 1) * getSoundEffectsVolume() * activePalette().trim;
    buildChain(context, entry.buffer, level).start();
    return true;
  } catch {
    return false;
  }
};

export interface SustainedSample {
  /** Coupe le son avec un court fondu, pour éviter un clic à l'arrêt. */
  stop: () => void;
}

/**
 * Joue un échantillon long en boucle, jusqu'à ce que l'appelant l'arrête.
 *
 * Sert aux sons qui accompagnent une attente — le rembobinage pendant
 * l'inversion des audios, par exemple. La boucle permet de couvrir une attente
 * plus longue que le fichier sans avoir à générer un son de trente secondes.
 *
 * Renvoie `null` si rien ne peut être joué : l'appelant continue sans son,
 * jamais en échec.
 */
export const playSustainedSample = (name: string, volume = 0.5): SustainedSample | null => {
  const sample = byAlias.get(name);
  if (!sample) return null;

  const entry = cache.get(sample.id);
  if (!entry) {
    void load(sample);
    return null;
  }
  if (entry.status !== 'ready') return null;

  const context = getSharedAudioContext();
  if (!context) return null;
  if (context.state === 'suspended') registerAudioContext(context);

  try {
    const source = context.createBufferSource();
    source.buffer = entry.buffer;
    source.loop = true;

    const gain = context.createGain();
    const level = volume * (sample.gain ?? 1) * getSoundEffectsVolume();
    const safe = Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0;
    gain.gain.value = safe;

    /*
     * Fondu d'entrée de 60 ms.
     *
     * L'arrêt avait le sien depuis toujours, l'attaque non : le son démarrait à
     * pleine amplitude, ce qui claque si le premier échantillon du fichier n'est
     * pas nul. Symétrique, donc, et sous test d'existence — les doubles de test
     * n'implémentent que `gain.value`.
     */
    if (typeof gain.gain.setValueAtTime === 'function'
      && typeof gain.gain.linearRampToValueAtTime === 'function') {
      const now = context.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(safe, now + 0.06);
    }

    source.connect(gain);
    gain.connect(context.destination);
    source.start();

    let stopped = false;
    return {
      stop: () => {
        if (stopped) return;
        stopped = true;
        try {
          const now = context.currentTime;
          // Fondu de 120 ms : couper net produirait un clic audible.
          gain.gain.setValueAtTime(gain.gain.value, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.12);
          source.stop(now + 0.14);
        } catch {
          // Source déjà terminée : rien à faire.
        }
      },
    };
  } catch {
    return null;
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
