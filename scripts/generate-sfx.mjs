#!/usr/bin/env node
/**
 * Génère les effets sonores du projet avec l'API Sound Effects d'ElevenLabs.
 *
 * À exécuter à la main, jamais au build ni à l'exécution : un son d'interface est
 * identique à chaque fois. Le générer une fois et commiter le fichier évite de
 * payer des crédits à chaque clic, supprime la latence réseau sur un son qui doit
 * partir en moins de 50 ms, et fait que la clé d'API ne touche jamais
 * l'application ni la production.
 *
 * Usage :
 *   node scripts/generate-sfx.mjs              # ne génère que ce qui manque
 *   node scripts/generate-sfx.mjs --force      # régénère tout
 *   node scripts/generate-sfx.mjs ui-click     # un ou plusieurs identifiants
 *
 * La clé se lit dans `ELEVENLABS_API_KEY`. Elle n'est jamais affichée ni écrite.
 */
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const MANIFEST = resolve(ROOT, 'src/lib/sfx/manifest.json');
const OUT_DIR = resolve(ROOT, 'public/sfx');

const API_URL = 'https://api.elevenlabs.io/v1/sound-generation';
/**
 * PCM brut 24 kHz, emballé en WAV avant écriture.
 *
 * Le banc était en MP3 ; il est désormais en WAV 24 kHz mono, parce que
 * `scripts/synth-sfx.mjs` — la voie locale, sans crédits — écrit du PCM. Les
 * deux chemins doivent produire le même format, sinon le chargeur ne sait plus
 * quoi demander. 24 kHz suffit : au-dessus de 12 kHz, il n'y a que ce qui
 * fatigue l'oreille.
 */
const OUTPUT_FORMAT = 'pcm_24000';
const SAMPLE_RATE = 24_000;

/** En-tête WAV mono 16 bits, ajouté au PCM renvoyé par l'API. */
const wrapPcmInWav = (pcm) => {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
};
/**
 * Interprétation plutôt littérale du prompt. Des sons d'interface doivent être
 * prévisibles et sobres, pas « créatifs ».
 */
const PROMPT_INFLUENCE = 0.6;

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error(
    "ELEVENLABS_API_KEY absente.\n" +
    'Pose-la sans la mettre dans le dépôt :  setx ELEVENLABS_API_KEY "ta_cle"\n' +
    'puis ouvre un nouveau terminal.',
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
 * Longueur maximale du texte envoyé, style compris.
 *
 * Vérifiée avant l'appel : sans ce garde-fou, un style un peu long fait échouer
 * les quarante-neuf requêtes l'une après l'autre avec un message noyé dans du
 * JSON, alors que la cause est la même pour toutes.
 */
const MAX_TEXT_LENGTH = 450;

const assemblePrompt = (sample, style) =>
  style ? `${sample.prompt}. ${style}.` : sample.prompt;

/** Retente uniquement ce qui est retentable : 429 et 5xx. */
async function generate(sample, style) {
  // Le style commun est ajouté à chaque prompt : c'est lui qui fait que les
  // sons vont ensemble au lieu de sonner comme quarante banques différentes.
  const text = assemblePrompt(sample, style);
  const body = JSON.stringify({
    text,
    duration_seconds: sample.durationSeconds,
    prompt_influence: PROMPT_INFLUENCE,
  });

  let lastDetail = '';
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${API_URL}?output_format=${OUTPUT_FORMAT}`, {
      method: 'POST',
      // Clé brute dans `xi-api-key`, sans préfixe : convention ElevenLabs.
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body,
    });

    if (response.ok) return Buffer.from(await response.arrayBuffer());

    lastDetail = (await response.text().catch(() => '')).slice(0, 300);
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable) {
      throw new Error(`HTTP ${response.status} — ${lastDetail}`);
    }
    await sleep(1_000 * (attempt + 1));
  }
  throw new Error(`épuisé après 3 tentatives — ${lastDetail}`);
}

// `JSON.parse` refuse un BOM UTF-8, que certains éditeurs Windows ajoutent
// silencieusement à l'enregistrement. On le retire au lieu de dépendre de
// l'encodage exact du fichier.
const manifestRaw = (await readFile(MANIFEST, 'utf8')).replace(/^\uFEFF/, '');
const manifest = JSON.parse(manifestRaw);
const samples = manifest.samples ?? [];
const selected = onlyIds.size > 0
  ? samples.filter((sample) => onlyIds.has(sample.id))
  : samples;

if (selected.length === 0) {
  console.error('Aucun échantillon sélectionné. Identifiants connus :');
  for (const sample of samples) console.error(`  ${sample.id}`);
  process.exit(1);
}

/* Tout vérifier avant le premier appel : un texte trop long est une erreur de
   rédaction, pas un aléa réseau, et elle vaut pour toute la sélection. */
const overLimit = selected
  .map((sample) => ({ id: sample.id, length: assemblePrompt(sample, manifest.style).length }))
  .filter((entry) => entry.length > MAX_TEXT_LENGTH);

if (overLimit.length > 0) {
  console.error(
    `Texte trop long : l'API refuse au-delà de ${MAX_TEXT_LENGTH} caractères, style compris.\n` +
    `Le style en occupe déjà ${(manifest.style ?? '').length + 2}. À raccourcir :`,
  );
  for (const entry of overLimit) console.error(`  ${entry.id} — ${entry.length}`);
  process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });

let written = 0;
let skipped = 0;
let failed = 0;
let billedSeconds = 0;

for (const sample of selected) {
  const target = resolve(OUT_DIR, `${sample.id}.wav`);

  if (!force && (await exists(target))) {
    skipped += 1;
    console.log(`= ${sample.id} (déjà présent)`);
    continue;
  }

  try {
    const audio = wrapPcmInWav(await generate(sample, manifest.style));
    await writeFile(target, audio);
    written += 1;
    billedSeconds += sample.durationSeconds;
    console.log(`+ ${sample.id}  ${sample.durationSeconds}s  ${(audio.length / 1024).toFixed(1)} Ko`);
  } catch (error) {
    failed += 1;
    console.error(`! ${sample.id} — ${error instanceof Error ? error.message : error}`);
  }
}

// 40 crédits par seconde dès que la durée est spécifiée.
console.log(
  `\n${written} généré(s), ${skipped} ignoré(s), ${failed} échec(s)` +
  ` — environ ${Math.round(billedSeconds * 40)} crédits consommés.`,
);
process.exit(failed > 0 ? 1 : 0);
