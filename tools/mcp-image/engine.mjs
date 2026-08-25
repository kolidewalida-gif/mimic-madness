/**
 * Moteur de génération d'images — ComfyUI local.
 *
 * Source unique partagée par le script en ligne de commande (`comfy.mjs`) et
 * par le serveur MCP (`index.mjs`), pour qu'ils ne puissent pas diverger.
 *
 * Deux moteurs, choisis par `COMFY_ENGINE` :
 *
 *  `qwen` — Qwen-Image 2512 quantifié GGUF Q4_K_M. C'est le seul des deux qui
 *    tient le brief « sérigraphie, objet personnifié, palette imposée, aucun
 *    texte » : réussi du premier coup là où SDXL a échoué quatre fois. Coûteux
 *    en revanche, ~46 s par étape sur cette machine — 20 milliards de
 *    paramètres, et ROCm sous Windows n'expose ni Flash ni Sage Attention.
 *    Ce n'est pas un manque de VRAM : le modèle quantifié se charge en entier.
 *
 *  `sdxl` — SDXL base 1.0, 2,6 milliards de paramètres, une douzaine de
 *    secondes par image. Utile pour dégrossir une composition, mais il ignore
 *    la palette imposée, refuse de personnifier un objet et incruste du texte
 *    malgré la consigne négative.
 *
 * Licences : Apache 2.0 pour Qwen, CreativeML OpenRAIL++-M pour SDXL base,
 * toutes deux compatibles avec un usage commercial. Ne jamais basculer sur
 * SDXL *Turbo*, qui est sous licence recherche non commerciale.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(HERE, '../..');

export const COMFY_URL = (process.env.COMFY_URL || 'http://127.0.0.1:8188').replace(/\/$/, '');
export const ENGINE = (process.env.COMFY_ENGINE || 'qwen').toLowerCase();
export const OUTPUT_ROOT = resolve(process.env.IMAGE_OUTPUT_ROOT || resolve(REPO, 'public'));

const SDXL_CKPT = process.env.COMFY_CKPT || 'sd_xl_base_1.0.safetensors';
const QWEN_UNET = process.env.COMFY_QWEN_UNET || 'qwen-image-2512-Q4_K_M.gguf';
const QWEN_CLIP = 'qwen_2.5_vl_7b_fp8_scaled.safetensors';
const QWEN_VAE = 'qwen_image_vae.safetensors';

/* Décalage de sampling propre à Qwen-Image ; 3.1 est la valeur du gabarit
   officiel ComfyUI. Sans lui les images sortent délavées. */
const QWEN_SHIFT = 3.1;

const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);

export const NEGATIVE_DEFAULT =
  'text, letters, words, typography, watermark, signature, logo, caption, ' +
  'numbers, gradient, glow, bloom, blurry, photorealistic, 3d render, ' +
  'soft shading, drop shadow, busy background, multiple subjects';

/**
 * Résout un chemin de sortie et refuse tout ce qui sortirait de OUTPUT_ROOT.
 *
 * `relative` est la vérification qui compte : un `startsWith` sur la chaîne se
 * ferait avoir par un voisin nommé `public-secrets/`.
 */
export function safeOutput(requested) {
  if (typeof requested !== 'string' || requested.trim() === '') {
    throw new Error('Chemin de sortie manquant.');
  }
  const absolute = isAbsolute(requested) ? resolve(requested) : resolve(OUTPUT_ROOT, requested);
  const rel = relative(OUTPUT_ROOT, absolute);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`Écriture refusée hors de ${OUTPUT_ROOT} : ${absolute}`);
  }
  const ext = extname(absolute).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error(`Extension refusée « ${ext || 'aucune'} ». Attendu : ${[...ALLOWED_EXT].join(', ')}.`);
  }
  return absolute;
}

/** Graphe Qwen-Image. `UnetLoaderGGUF` vient de l'extension ComfyUI-GGUF. */
function buildQwenGraph({ prompt, negative, width, height, seed, steps, cfg }) {
  return {
    '1': { class_type: 'UnetLoaderGGUF', inputs: { unet_name: QWEN_UNET } },
    '2': {
      class_type: 'CLIPLoader',
      inputs: { clip_name: QWEN_CLIP, type: 'qwen_image', device: 'default' },
    },
    '3': { class_type: 'VAELoader', inputs: { vae_name: QWEN_VAE } },
    '4': { class_type: 'ModelSamplingAuraFlow', inputs: { model: ['1', 0], shift: QWEN_SHIFT } },
    '5': { class_type: 'CLIPTextEncode', inputs: { clip: ['2', 0], text: prompt } },
    '6': { class_type: 'CLIPTextEncode', inputs: { clip: ['2', 0], text: negative } },
    '7': { class_type: 'EmptySD3LatentImage', inputs: { width, height, batch_size: 1 } },
    '8': {
      class_type: 'KSampler',
      inputs: {
        model: ['4', 0],
        positive: ['5', 0],
        negative: ['6', 0],
        latent_image: ['7', 0],
        seed,
        steps,
        cfg,
        sampler_name: 'euler',
        scheduler: 'simple',
        denoise: 1,
      },
    },
    '9': { class_type: 'VAEDecode', inputs: { samples: ['8', 0], vae: ['3', 0] } },
    '10': { class_type: 'SaveImage', inputs: { images: ['9', 0], filename_prefix: 'kiosque' } },
  };
}

/** Graphe SDXL. Le checkpoint porte à lui seul modèle, CLIP et VAE. */
function buildSdxlGraph({ prompt, negative, width, height, seed, steps, cfg }) {
  return {
    '1': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: SDXL_CKPT } },
    '2': { class_type: 'CLIPTextEncode', inputs: { clip: ['1', 1], text: prompt } },
    '3': { class_type: 'CLIPTextEncode', inputs: { clip: ['1', 1], text: negative } },
    '4': { class_type: 'EmptyLatentImage', inputs: { width, height, batch_size: 1 } },
    '5': {
      class_type: 'KSampler',
      inputs: {
        model: ['1', 0],
        positive: ['2', 0],
        negative: ['3', 0],
        latent_image: ['4', 0],
        seed,
        steps,
        cfg,
        /* dpmpp_2m + karras : la combinaison de référence sur SDXL, nette sans
           les artefacts de bord d'euler sur des aplats. */
        sampler_name: 'dpmpp_2m',
        scheduler: 'karras',
        denoise: 1,
      },
    },
    '6': { class_type: 'VAEDecode', inputs: { samples: ['5', 0], vae: ['1', 2] } },
    '7': { class_type: 'SaveImage', inputs: { images: ['6', 0], filename_prefix: 'kiosque' } },
  };
}

/*
 * Dimensions en 3:4 exact et multiples de 64 dans les deux cas : c'est
 * l'`aspect-ratio` déclaré par `.kq-poster-art` en CSS, et SDXL dégrade
 * nettement hors de ces alignements.
 */
export const ENGINE_DEFAULTS = {
  qwen: { width: 960, height: 1280, steps: 20, cfg: 3.5, build: buildQwenGraph },
  sdxl: { width: 768, height: 1024, steps: 28, cfg: 7, build: buildSdxlGraph },
};

async function submit(graph) {
  const res = await fetch(`${COMFY_URL}/prompt`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: graph }),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`POST /prompt a répondu ${res.status} : ${raw.slice(0, 700)}`);

  const { prompt_id: promptId, node_errors: nodeErrors } = JSON.parse(raw);
  if (nodeErrors && Object.keys(nodeErrors).length > 0) {
    throw new Error(`Graphe refusé : ${JSON.stringify(nodeErrors).slice(0, 700)}`);
  }
  if (!promptId) throw new Error(`Pas de prompt_id : ${raw.slice(0, 300)}`);
  return promptId;
}

/**
 * Attend la fin d'exécution et renvoie la première image produite.
 *
 * 45 minutes de marge : à ~46 s par étape et 20 étapes, une image Qwen prend
 * un bon quart d'heure sur cette machine.
 */
async function waitForImage(promptId, timeoutMs = 45 * 60 * 1000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await fetch(`${COMFY_URL}/history/${promptId}`);
    if (res.ok) {
      const entry = (await res.json())?.[promptId];
      if (entry) {
        if (entry.status?.status_str === 'error') {
          throw new Error(
            `ComfyUI a échoué : ${JSON.stringify(entry.status?.messages ?? []).slice(0, 900)}`,
          );
        }
        for (const output of Object.values(entry.outputs ?? {})) {
          if (output?.images?.[0]) return output.images[0];
        }
        if (entry.status?.status_str === 'success') {
          throw new Error('Exécution terminée sans image.');
        }
      }
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error('Délai dépassé en attendant ComfyUI.');
}

async function download({ filename, subfolder, type }) {
  const query = new URLSearchParams({
    filename,
    subfolder: subfolder ?? '',
    type: type ?? 'output',
  });
  const res = await fetch(`${COMFY_URL}/view?${query}`);
  if (!res.ok) throw new Error(`GET /view a répondu ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Génère une image et l'écrit sur disque.
 *
 * @returns {Promise<{ path: string, relative: string, bytes: number, seconds: number }>}
 */
export async function generate(job) {
  const started = Date.now();
  const preset = ENGINE_DEFAULTS[ENGINE];
  if (!preset) throw new Error(`Moteur inconnu « ${ENGINE} ». Attendu : qwen ou sdxl.`);

  const target = safeOutput(job.out ?? job.outputPath);
  const graph = preset.build({
    prompt: job.prompt,
    negative: job.negative ?? NEGATIVE_DEFAULT,
    width: job.width ?? preset.width,
    height: job.height ?? preset.height,
    seed: job.seed ?? Math.floor(Math.random() * 2 ** 32),
    steps: job.steps ?? preset.steps,
    cfg: job.cfg ?? preset.cfg,
  });

  const promptId = await submit(graph);
  const image = await waitForImage(promptId);
  const buffer = await download(image);

  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, buffer);

  return {
    path: target,
    relative: relative(OUTPUT_ROOT, target).split('\\').join('/'),
    bytes: buffer.byteLength,
    seconds: Math.round((Date.now() - started) / 1000),
  };
}
