/**
 * Vignettes de clips — le calcul qui rend les gros fichiers indolores.
 *
 * La capture elle-même a besoin d'un décodeur vidéo réel, absent de jsdom : on
 * vérifie ici les deux décisions pures (dimensions, instant de capture) et le
 * fait que la capture échoue proprement au lieu de bloquer un import.
 */
import { describe, expect, it } from 'vitest';
import {
  captureVideoPoster,
  posterDimensions,
  posterSeekTime,
} from '@/lib/videoPoster';
import { posterPathFor } from '@/lib/videoStorageSupabase';

describe('vignette — dimensions de sortie', () => {
  it('réduit une vidéo paysage au côté maximal', () => {
    expect(posterDimensions(1920, 1080, 640)).toEqual({ width: 640, height: 360 });
  });

  it('réduit une vidéo portrait au côté maximal', () => {
    expect(posterDimensions(1080, 1920, 640)).toEqual({ width: 360, height: 640 });
  });

  it('réduit un format carré', () => {
    expect(posterDimensions(1000, 1000, 640)).toEqual({ width: 640, height: 640 });
  });

  it('n’agrandit jamais une petite vidéo', () => {
    expect(posterDimensions(320, 180, 640)).toEqual({ width: 320, height: 180 });
  });

  it('laisse une vidéo pile à la taille cible inchangée', () => {
    expect(posterDimensions(640, 360, 640)).toEqual({ width: 640, height: 360 });
  });

  it('préserve le rapport d’aspect', () => {
    const { width, height } = posterDimensions(1600, 900, 640);
    expect(Math.abs(width / height - 16 / 9)).toBeLessThan(0.02);
  });

  it('ne renvoie jamais une dimension nulle', () => {
    const { width, height } = posterDimensions(10_000, 1, 640);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });

  it('se rabat sur un carré pour des dimensions absurdes', () => {
    expect(posterDimensions(0, 0, 640)).toEqual({ width: 640, height: 640 });
    expect(posterDimensions(-100, 50, 640)).toEqual({ width: 640, height: 640 });
    expect(posterDimensions(Number.NaN, 720, 640)).toEqual({ width: 640, height: 640 });
  });

  it('respecte un côté maximal personnalisé', () => {
    expect(posterDimensions(1920, 1080, 320)).toEqual({ width: 320, height: 180 });
  });
});

describe('vignette — instant de capture', () => {
  it('capture à l’instant demandé quand le clip est assez long', () => {
    expect(posterSeekTime(10, 0.5)).toBe(0.5);
  });

  it('se replie au milieu quand le clip est plus court que l’instant demandé', () => {
    expect(posterSeekTime(0.4, 0.5)).toBeCloseTo(0.2);
  });

  it('se replie au milieu quand la durée égale l’instant demandé', () => {
    expect(posterSeekTime(0.5, 0.5)).toBeCloseTo(0.25);
  });

  it('renvoie zéro pour une durée inconnue', () => {
    expect(posterSeekTime(Number.NaN, 0.5)).toBe(0);
    expect(posterSeekTime(Number.POSITIVE_INFINITY, 0.5)).toBe(0);
  });

  it('renvoie zéro pour une durée nulle ou négative', () => {
    expect(posterSeekTime(0, 0.5)).toBe(0);
    expect(posterSeekTime(-4, 0.5)).toBe(0);
  });

  it('ne renvoie jamais un instant négatif', () => {
    for (const duration of [0, 0.1, 1, 60, Number.NaN]) {
      expect(posterSeekTime(duration, 0.5)).toBeGreaterThanOrEqual(0);
    }
  });

  it('reste dans les bornes du clip', () => {
    for (const duration of [0.2, 1, 5, 200]) {
      expect(posterSeekTime(duration, 0.5)).toBeLessThan(duration);
    }
  });

  it('gère un instant demandé nul', () => {
    expect(posterSeekTime(10, 0)).toBe(0);
  });
});

describe('vignette — robustesse de la capture', () => {
  it('renvoie null quand la vidéo est indécodable, sans lever d’erreur', async () => {
    // jsdom ne décode aucune vidéo : la capture doit abandonner proprement pour
    // ne jamais faire échouer l'import du clip.
    const blob = new Blob(['pas une video'], { type: 'video/mp4' });
    await expect(captureVideoPoster(blob, { timeoutMs: 50 })).resolves.toBeNull();
  });

  it('abandonne dans le délai imparti', async () => {
    const blob = new Blob(['pas une video'], { type: 'video/mp4' });
    const started = Date.now();
    await captureVideoPoster(blob, { timeoutMs: 60 });
    expect(Date.now() - started).toBeLessThan(3_000);
  });

  it('reste sans effet sur un fichier vide', async () => {
    await expect(captureVideoPoster(new Blob([]), { timeoutMs: 50 })).resolves.toBeNull();
  });
});

describe('vignette — chemin de stockage', () => {
  it('dérive le chemin depuis celui de la vidéo', () => {
    expect(posterPathFor('joueur/clip.mp4')).toBe('joueur/clip.mp4.poster.jpg');
  });

  it('reste distinct du fichier de bande rythmo', () => {
    expect(posterPathFor('joueur/clip.mp4')).not.toBe('joueur/clip.cues.json');
  });

  it('est déterministe', () => {
    expect(posterPathFor('a/b.webm')).toBe(posterPathFor('a/b.webm'));
  });
});
