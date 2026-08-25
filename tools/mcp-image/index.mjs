#!/usr/bin/env node
/**
 * Serveur MCP de génération d'images — Mimic Master.
 *
 * Expose la génération locale ComfyUI comme outils MCP, pour que l'agent
 * puisse produire un asset, le relire et itérer sans intervention manuelle.
 *
 * Vit hors de `src/` : Vite ne le voit jamais, il ne part pas dans le bundle.
 *
 * Aucune clé, aucun quota, rien ne quitte la machine. Gemini avait été essayé
 * d'abord et abandonné : son palier gratuit ne comprend aucune génération
 * d'images — les cinq modèles image renvoient `limit: 0`, soit une allocation
 * nulle et non un quota épuisé, alors qu'un modèle texte répondait
 * normalement avec la même clé.
 *
 * Configuration (voir .kiro/settings/mcp.json) :
 *   COMFY_URL          — défaut http://127.0.0.1:8188
 *   COMFY_ENGINE       — `qwen` (qualité) ou `sdxl` (rapide), défaut qwen
 *   IMAGE_OUTPUT_ROOT  — racine autorisée en écriture, défaut <repo>/public
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {
  COMFY_URL,
  ENGINE,
  ENGINE_DEFAULTS,
  OUTPUT_ROOT,
  generate,
} from './engine.mjs';

const server = new Server(
  { name: 'mimic-image', version: '2.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'generate_image',
      description:
        `Génère une image avec ComfyUI en local (moteur ${ENGINE}) et l'écrit ` +
        `sous ${OUTPUT_ROOT}. Le moteur qwen rend nettement mieux les consignes ` +
        `de style et de palette, mais compte environ un quart d'heure par image ; ` +
        `sdxl répond en une douzaine de secondes avec un suivi bien plus faible.`,
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: "Description de l'image voulue." },
          outputPath: {
            type: 'string',
            description: 'Chemin relatif à la racine autorisée, ex. `lobby/cards/kiosque/quiz.png`.',
          },
          negative: {
            type: 'string',
            description: 'Consigne négative. Une valeur par défaut interdit déjà texte et dégradés.',
          },
          width: { type: 'number', description: 'Largeur, multiple de 64.' },
          height: { type: 'number', description: 'Hauteur, multiple de 64.' },
          seed: { type: 'number', description: 'Graine, pour reproduire un rendu.' },
          steps: { type: 'number', description: "Nombre d'étapes de sampling." },
          cfg: { type: 'number', description: "Force de la consigne." },
        },
        required: ['prompt', 'outputPath'],
      },
    },
    {
      name: 'comfy_status',
      description:
        "Vérifie que ComfyUI répond et renvoie le GPU, la VRAM et le moteur " +
        "configuré. À appeler avant une série de générations.",
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    if (name === 'comfy_status') {
      const res = await fetch(`${COMFY_URL}/system_stats`);
      if (!res.ok) throw new Error(`ComfyUI a répondu ${res.status}`);
      const stats = await res.json();
      const preset = ENGINE_DEFAULTS[ENGINE];

      const devices = (stats.devices ?? [])
        .map((d) => `    ${d.name} — ${(d.vram_total / 1024 ** 3).toFixed(1)} Go`)
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text:
              `ComfyUI répond sur ${COMFY_URL}\n` +
              `  torch  : ${stats.system?.pytorch_version ?? 'inconnu'}\n` +
              `  moteur : ${ENGINE} (${preset.width}×${preset.height}, ${preset.steps} étapes, cfg ${preset.cfg})\n` +
              `  sortie : ${OUTPUT_ROOT}\n` +
              `  GPU :\n${devices}`,
          },
        ],
      };
    }

    if (name !== 'generate_image') throw new Error(`Outil inconnu : ${name}`);

    const result = await generate({ ...args, out: args.outputPath });

    return {
      content: [
        {
          type: 'text',
          text:
            `Image écrite.\n` +
            `  fichier : ${result.relative}\n` +
            `  chemin  : ${result.path}\n` +
            `  taille  : ${(result.bytes / 1024).toFixed(0)} Ko\n` +
            `  durée   : ${result.seconds} s (moteur ${ENGINE})`,
        },
      ],
    };
  } catch (error) {
    return {
      isError: true,
      content: [{ type: 'text', text: error?.message ?? String(error) }],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);

/* stderr uniquement : stdout porte le protocole MCP, y écrire le casse. */
process.stderr.write(
  `[mimic-image] prêt · moteur ${ENGINE} · ComfyUI ${COMFY_URL} · racine ${OUTPUT_ROOT}\n`,
);
