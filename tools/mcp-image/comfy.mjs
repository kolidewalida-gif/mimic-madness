/**
 * Génération d'assets en lot, en ligne de commande.
 *
 *   node tools/mcp-image/comfy.mjs tools/mcp-image/jobs-cards.json
 *
 * Chaque entrée du fichier : { out, prompt, negative?, width?, height?, seed?,
 * steps?, cfg? }. Toute la logique vit dans `engine.mjs`, partagée avec le
 * serveur MCP pour que les deux ne divergent pas.
 */
import { readFile } from 'node:fs/promises';
import { ENGINE, OUTPUT_ROOT, generate } from './engine.mjs';

const jobsPath = process.argv[2];
if (!jobsPath) {
  console.error('Usage : node tools/mcp-image/comfy.mjs <jobs.json>');
  process.exit(1);
}

const jobs = JSON.parse(await readFile(jobsPath, 'utf8'));
console.log(`moteur : ${ENGINE} · ${jobs.length} image(s) · sortie sous ${OUTPUT_ROOT}\n`);

let done = 0;
let failed = 0;

for (const job of jobs) {
  try {
    const result = await generate(job);
    console.log(
      `OK   ${result.relative}  ${(result.bytes / 1024).toFixed(0)} Ko  ${result.seconds} s`,
    );
    done += 1;
  } catch (error) {
    console.log(`KO   ${job.out}  ${error?.message ?? error}`);
    failed += 1;
  }
}

console.log(`\n${done} réussie(s), ${failed} échec(s).`);
process.exitCode = failed > 0 && done === 0 ? 1 : 0;
