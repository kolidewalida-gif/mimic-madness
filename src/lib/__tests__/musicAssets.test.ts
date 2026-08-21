import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Les pistes servies depuis `public/music/` doivent exister.
 *
 * `useBackgroundMusic` réagit à une erreur de chargement par `goNext()`. Un
 * fichier manquant ne produit donc aucun message : le lecteur enchaîne les
 * pistes en boucle et le joueur n'a plus de musique, sans savoir pourquoi.
 * Ce test transforme cet échec silencieux en échec de build.
 */
const HOOK = resolve(process.cwd(), 'src/hooks/useBackgroundMusic.tsx');
const MANIFEST = resolve(process.cwd(), 'scripts/music-manifest.json');

const localTrackPaths = (): string[] => {
  const source = readFileSync(HOOK, 'utf8');
  return [...source.matchAll(/src:\s*'(\/music\/[^']+)'/g)].map((match) => match[1]);
};

describe('pistes musicales locales', () => {
  it('référence les thèmes originaux', () => {
    expect(localTrackPaths().length).toBeGreaterThanOrEqual(5);
  });

  it('expose la famille « Signature » au complet', () => {
    /*
     * Ces trois morceaux partagent un motif et un principe d'écriture : ils
     * n'ont d'intérêt qu'ensemble. En oublier un dans la playlist casserait
     * l'identité sans provoquer la moindre erreur.
     */
    const paths = localTrackPaths();
    for (const id of ['signature', 'pressure', 'crown']) {
      expect(paths, `piste absente de la playlist : ${id}`)
        .toContain(`/music/mimic-master-${id}.mp3`);
    }
  });

  it('a un fichier MP3 valide pour chaque piste référencée', () => {
    for (const path of localTrackPaths()) {
      const file = resolve(process.cwd(), 'public', path.replace(/^\//, ''));
      expect(existsSync(file), `fichier manquant : ${path}`).toBe(true);

      const head = readFileSync(file).subarray(0, 3);
      const isId3 = head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33;
      const isMpegSync = head[0] === 0xff;
      expect(isId3 || isMpegSync, `${path} n'est pas un MP3`).toBe(true);
    }
  });

  it('dure bien environ deux minutes chacune', () => {
    /*
     * 128 kbps constant, donc 16 000 octets par seconde : la durée se déduit de
     * la taille. Une génération tronquée passerait autrement inaperçue jusqu'à
     * ce qu'un joueur l'entende s'arrêter net.
     */
    const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8').replace(/^\uFEFF/, ''));

    for (const track of manifest.tracks as Array<{ id: string; lengthMs: number }>) {
      const file = resolve(process.cwd(), 'public/music', `${track.id}.mp3`);
      if (!existsSync(file)) continue;

      const seconds = readFileSync(file).byteLength / 16_000;
      const expected = track.lengthMs / 1_000;
      expect(seconds, `${track.id} : ${seconds.toFixed(0)} s au lieu de ${expected} s`)
        .toBeGreaterThan(expected * 0.9);
    }
  });

  it('ne fabrique pas deux fois la même piste', () => {
    // Deux prompts distincts doivent donner deux compositions distinctes.
    const contents = (JSON.parse(readFileSync(MANIFEST, 'utf8').replace(/^\uFEFF/, ''))
      .tracks as Array<{ id: string }>)
      .map(({ id }) => resolve(process.cwd(), 'public/music', `${id}.mp3`))
      .filter((file) => existsSync(file))
      .map((file) => readFileSync(file).toString('base64'));

    expect(new Set(contents).size).toBe(contents.length);
  });
});
