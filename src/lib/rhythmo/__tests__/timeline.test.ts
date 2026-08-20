import { describe, expect, it } from 'vitest';
import {
  estimateRhythmoWordWidth,
  findActiveRhythmoWord,
  getRhythmoStripOffset,
  getRhythmoTimelineTime,
  placeRhythmoWords,
  sanitizeRhythmoLeadSeconds,
} from '@/lib/rhythmo/timeline';

const words = [
  { start: 0.5, end: 1.2 },
  { start: 1.8, end: 2.2 },
  { start: 3, end: 3.5 },
];

describe('rhythmo media clock', () => {
  it('keeps exact video.currentTime alignment with the default lead', () => {
    expect(getRhythmoTimelineTime(4.25)).toBe(4.25);
  });

  it('applies a configurable positive lead to video.currentTime', () => {
    expect(getRhythmoTimelineTime(4.25, 0.35)).toBeCloseTo(4.6);
  });

  it('neutralizes negative and non-finite lead values', () => {
    expect(sanitizeRhythmoLeadSeconds(-1)).toBe(0);
    expect(sanitizeRhythmoLeadSeconds(Number.NaN)).toBe(0);
    expect(getRhythmoTimelineTime(Number.POSITIVE_INFINITY, 0.4)).toBe(0.4);
  });

  it('positions the strip from the shared timeline time', () => {
    const timelineTime = getRhythmoTimelineTime(1.5, 0.5);
    expect(getRhythmoStripOffset(100, timelineTime, 100)).toBe(-100);
  });
});

describe('rhythmo active word', () => {
  it('uses inclusive word boundaries', () => {
    expect(findActiveRhythmoWord(words, 1.8)).toBe(1);
    expect(findActiveRhythmoWord(words, 2.2)).toBe(1);
  });

  it('returns no word between timed spans', () => {
    expect(findActiveRhythmoWord(words, 1.5)).toBe(-1);
  });

  it('rescans earlier words after a backwards seek', () => {
    expect(findActiveRhythmoWord(words, 0.9, 2)).toBe(0);
  });
});

// ── Placement des mots : la bande doit rester lisible ──────────────────────

describe('rhythmo word placement', () => {
  const FONT = 24;
  const SPEED = 190;

  /** Vérifie qu'aucun mot n'empiète sur le suivant. */
  const hasOverlap = (
    layout: Array<{ left: number; width: number }>,
  ): boolean =>
    layout.some((word, index) => {
      const next = layout[index + 1];
      return next !== undefined && next.left < word.left + word.width;
    });

  it('estime une largeur croissante avec la longueur du texte', () => {
    expect(estimateRhythmoWordWidth('musique', FONT))
      .toBeGreaterThan(estimateRhythmoWordWidth('je', FONT));
  });

  it('donne une largeur minimale à un mot très court', () => {
    expect(estimateRhythmoWordWidth('à', FONT)).toBeGreaterThanOrEqual(FONT);
  });

  it('se rabat sur une taille par défaut si la police est absurde', () => {
    expect(estimateRhythmoWordWidth('mot', Number.NaN)).toBeGreaterThan(0);
  });

  it('place le premier mot à sa position temporelle', () => {
    const layout = placeRhythmoWords([{ text: 'salut', start: 1, end: 1.3 }], SPEED, FONT);
    expect(layout[0].left).toBe(190);
  });

  it('ne fait pas se chevaucher deux mots proches dans le temps', () => {
    // « je » et « mange » à 50 ms d'intervalle : sans correction ils se
    // superposaient complètement.
    const layout = placeRhythmoWords(
      [
        { text: 'je', start: 1, end: 1.04 },
        { text: 'mange', start: 1.05, end: 1.2 },
      ],
      SPEED,
      FONT,
    );
    expect(hasOverlap(layout)).toBe(false);
  });

  it('ne fait jamais se chevaucher un débit de parole soutenu', () => {
    // Quatre mots par seconde sur dix secondes, ce que produit une vidéo réelle.
    const words = Array.from({ length: 40 }, (_, i) => ({
      text: 'musique',
      start: i * 0.25,
      end: i * 0.25 + 0.2,
    }));
    expect(hasOverlap(placeRhythmoWords(words, SPEED, FONT))).toBe(false);
  });

  it('ne fait jamais se chevaucher des mots très longs', () => {
    const words = Array.from({ length: 20 }, (_, i) => ({
      text: 'incompréhensiblement',
      start: i * 0.3,
      end: i * 0.3 + 0.25,
    }));
    expect(hasOverlap(placeRhythmoWords(words, SPEED, FONT))).toBe(false);
  });

  it('conserve l’ordre des mots', () => {
    const layout = placeRhythmoWords(
      [
        { text: 'un', start: 0, end: 0.2 },
        { text: 'deux', start: 0.1, end: 0.3 },
        { text: 'trois', start: 0.2, end: 0.4 },
      ],
      SPEED,
      FONT,
    );
    expect(layout[0].left).toBeLessThan(layout[1].left);
    expect(layout[1].left).toBeLessThan(layout[2].left);
  });

  it('respecte la position temporelle quand la parole est espacée', () => {
    // Deux mots à une seconde d'intervalle : aucun décalage nécessaire.
    const layout = placeRhythmoWords(
      [
        { text: 'un', start: 0, end: 0.2 },
        { text: 'deux', start: 1, end: 1.2 },
      ],
      SPEED,
      FONT,
    );
    expect(layout[1].left).toBe(190);
  });

  it('donne à un mot tenu une largeur au moins égale à sa durée', () => {
    const layout = placeRhythmoWords([{ text: 'oh', start: 0, end: 2 }], SPEED, FONT);
    expect(layout[0].width).toBeGreaterThanOrEqual(2 * SPEED);
  });

  it('laisse un espace entre deux mots repoussés', () => {
    const layout = placeRhythmoWords(
      [
        { text: 'alpha', start: 0, end: 0.1 },
        { text: 'beta', start: 0.05, end: 0.15 },
      ],
      SPEED,
      FONT,
      20,
    );
    expect(layout[1].left).toBeGreaterThanOrEqual(layout[0].left + layout[0].width + 20);
  });

  it('renvoie un placement par mot', () => {
    const words = Array.from({ length: 7 }, (_, i) => ({
      text: 'mot',
      start: i * 0.4,
      end: i * 0.4 + 0.2,
    }));
    expect(placeRhythmoWords(words, SPEED, FONT)).toHaveLength(7);
  });

  it('gère une liste vide', () => {
    expect(placeRhythmoWords([], SPEED, FONT)).toEqual([]);
  });

  it('ne produit jamais de position négative', () => {
    const layout = placeRhythmoWords(
      [{ text: 'mot', start: -5, end: -1 }],
      SPEED,
      FONT,
    );
    expect(layout[0].left).toBeGreaterThanOrEqual(0);
  });

  it('supporte des durées incohérentes sans largeur négative', () => {
    const layout = placeRhythmoWords(
      [{ text: 'mot', start: 2, end: 1 }],
      SPEED,
      FONT,
    );
    expect(layout[0].width).toBeGreaterThan(0);
  });

  it('supporte une vitesse absurde sans planter', () => {
    const layout = placeRhythmoWords(
      [{ text: 'mot', start: 1, end: 1.2 }],
      Number.NaN,
      FONT,
    );
    expect(Number.isFinite(layout[0].left)).toBe(true);
  });

  it('est déterministe', () => {
    const words = [
      { text: 'un', start: 0, end: 0.2 },
      { text: 'deux', start: 0.1, end: 0.3 },
    ];
    expect(placeRhythmoWords(words, SPEED, FONT))
      .toEqual(placeRhythmoWords(words, SPEED, FONT));
  });
});
