#!/usr/bin/env node
/**
 * Génère les musiques originales du jeu avec l'API Eleven Music.
 *
 * Séparé de `generate-sfx.mjs` à dessein : autre endpoint, autre modèle, et un
 * coût bien supérieur. Deux minutes de musique ne se relancent pas par
 * distraction, d'où l'absence de régénération implicite — il faut `--force`.
 *
 * Usage :
 *   node scripts/generate-music.mjs                        # ce qui manque
 *   node scripts/generate-music.mjs --force                # tout
 *   node scripts/generate-music.mjs mimic-master-theme     # un morceau
 *
 * La clé se lit dans `ELEVENLABS_API_KEY`. Elle n'est jamais affichée ni écrite.
 */
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const MANIFEST = resolve(HERE, 'music-manifest.json');
const OUT_DIR = resolve(ROOT, 'public/music');

const API_URL = 'https://api.elevenlabs.io/v1/music';
/**
 * `music_v2` explicitement : l'API garde `music_v1` par défaut pendant la
 * transition, alors que v2 tient beaucoup mieux le prompt et la structure.
 */
const MODEL_ID = 'music_v2';
const OUTPUT_FORMAT = 'mp3_44100_128';

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error(
    "ELEVENLABS_API_KEY absente.\n" +
    'Pose-la sans la mettre dans le dépôt :  setx ELEVENLABS_API_KEY "ta_cle"',
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const onlyIds = new Set(args.filter((arg) => !arg.startsWith('--')));

const exists = async (path) => {
  try {
    const info = await stat(path);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
};

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/**
 * Construit le corps de la requête.
 *
 * `prompt` et `composition_plan` sont mutuellement exclusifs côté API. Un plan
 * donne le contrôle section par section : c'est lui qui permet de placer le
 * motif signature à l'intro puis de le réénoncer au climax, ce qu'un prompt
 * unique ne garantit pas.
 *
 * L'identité commune (`signature`) et les interdits (`banned`) sont injectés
 * depuis la racine du manifeste plutôt que recopiés dans chaque section : c'est
 * ce qui fait que les morceaux s'entendent comme une même famille, et ça laisse
 * un seul endroit à régler.
 */
function buildBody(track, manifest) {
  if (!track.plan) {
    return JSON.stringify({
      prompt: track.prompt,
      music_length_ms: track.lengthMs,
      model_id: MODEL_ID,
    });
  }

  const signature = manifest.signature ?? [];
  const banned = manifest.banned ?? [];

  const chunks = track.plan.chunks.map((chunk, index) => ({
    ...chunk,
    // La doc insiste : les styles de la première section fixent le ton de tout
    // le morceau. L'identité y passe donc en tête.
    positive_styles: index === 0
      ? [...signature, ...(chunk.positive_styles ?? [])]
      : (chunk.positive_styles ?? []),
    negative_styles: [
      ...new Set([...(chunk.negative_styles ?? []), ...banned]),
    ],
    context_adherence: chunk.context_adherence ?? 'high',
  }));

  return JSON.stringify({ composition_plan: { chunks }, model_id: MODEL_ID });
}

async function compose(track, manifest) {
  const body = buildBody(track, manifest);

  let lastDetail = '';
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${API_URL}?output_format=${OUTPUT_FORMAT}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body,
    });

    if (response.ok) return Buffer.from(await response.arrayBuffer());

    lastDetail = (await response.text().catch(() => '')).slice(0, 400);

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `HTTP ${response.status} — l'API Music est réservée aux abonnements payants. ${lastDetail}`,
      );
    }
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable) throw new Error(`HTTP ${response.status} — ${lastDetail}`);

    // La génération musicale est longue : on laisse plus de marge qu'un SFX.
    await sleep(5_000 * (attempt + 1));
  }
  throw new Error(`épuisé après 3 tentatives — ${lastDetail}`);
}

const manifestRaw = (await readFile(MANIFEST, 'utf8')).replace(/^\uFEFF/, '');
const manifest = JSON.parse(manifestRaw);
const tracks = manifest.tracks ?? [];
const selected = onlyIds.size > 0 ? tracks.filter((t) => onlyIds.has(t.id)) : tracks;

if (selected.length === 0) {
  console.error('Aucun morceau sélectionné. Identifiants connus :');
  for (const track of tracks) console.error(`  ${track.id}`);
  process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });

let written = 0;
let skipped = 0;
let failed = 0;

for (const track of selected) {
  const target = resolve(OUT_DIR, `${track.id}.mp3`);

  if (!force && (await exists(target))) {
    skipped += 1;
    console.log(`= ${track.id} (déjà présent)`);
    continue;
  }

  const planned = track.plan
    ? track.plan.chunks.reduce((total, chunk) => total + chunk.duration_ms, 0)
    : track.lengthMs;
  if (track.plan && planned !== track.lengthMs) {
    // Un écart signale une section mal dimensionnée : mieux vaut le dire que de
    // livrer un morceau plus court que prévu sans que personne ne le remarque.
    console.warn(
      `! ${track.id} — sections = ${planned} ms, annoncé ${track.lengthMs} ms`,
    );
  }

  const startedAt = Date.now();
  console.log(`… ${track.id} — ${(planned / 1000).toFixed(0)} s demandées`);
  try {
    const audio = await compose(track, manifest);
    await writeFile(target, audio);
    written += 1;
    console.log(
      `+ ${track.id}  ${(audio.length / 1024 / 1024).toFixed(2)} Mo` +
      `  en ${((Date.now() - startedAt) / 1000).toFixed(0)} s`,
    );
  } catch (error) {
    failed += 1;
    console.error(`! ${track.id} — ${error instanceof Error ? error.message : error}`);
  }
}

console.log(`\n${written} généré(s), ${skipped} ignoré(s), ${failed} échec(s).`);
process.exit(failed > 0 ? 1 : 0);
