import { describe, expect, it } from 'vitest';
import {
  MAX_STACKED_FILTERS,
  VOICE_FILTERS,
  combinedSemitones,
  describeFilters,
  requiresPostProcessing,
  type VoiceFilterId,
} from '@/lib/voiceFilters';

describe('catalogue des voix', () => {
  it('ne déclare aucun doublon', () => {
    const ids = VOICE_FILTERS.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('commence par « Naturel », qui n’est pas un effet', () => {
    // La remise à zéro doit rester le premier bouton de la grille.
    expect(VOICE_FILTERS[0].id).toBe('none');
  });

  it('décrit chaque voix pour l’infobulle', () => {
    for (const entry of VOICE_FILTERS) {
      expect(entry.label.length, `${entry.id} sans libellé`).toBeGreaterThan(2);
      expect(entry.description.length, `${entry.id} sans description`).toBeGreaterThan(5);
      expect(entry.emoji.length, `${entry.id} sans emoji`).toBeGreaterThan(0);
      expect(entry.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('offre assez de voix pour varier', () => {
    // Hors « Naturel ».
    expect(VOICE_FILTERS.length - 1).toBeGreaterThanOrEqual(14);
  });
});

describe('cumul de plusieurs voix', () => {
  it('additionne les décalages de hauteur', () => {
    // Le cas demandé : Grave et Écho ensemble. L'écho ne touche pas la hauteur,
    // donc seul Grave compte.
    expect(combinedSemitones(['deep', 'echo'])).toBe(-5);
    // Deux effets de hauteur s'ajoutent bel et bien.
    expect(combinedSemitones(['deep', 'monstre'])).toBe(-12);
    expect(combinedSemitones(['helium', 'lutin'])).toBe(12);
  });

  it('laisse deux effets contraires s’annuler', () => {
    /*
     * Hélium (+6) avec Grave (−5) donne +1 : presque naturel. C'est le résultat
     * juste — le joueur a choisi deux effets qui se contrarient, on ne va pas
     * décider à sa place lequel ignorer.
     */
    expect(combinedSemitones(['helium', 'deep'])).toBe(1);
  });

  it('borne le cumul à une octave', () => {
    // Au-delà, la voix cesse d'être intelligible.
    expect(combinedSemitones(['monstre', 'deep', 'monstre'])).toBe(-12);
    expect(combinedSemitones(['lutin', 'helium', 'lutin'])).toBe(12);
  });

  it('ignore « Naturel » dans un cumul', () => {
    expect(combinedSemitones(['none', 'deep'])).toBe(-5);
    expect(combinedSemitones(['none'])).toBe(0);
    expect(combinedSemitones([])).toBe(0);
  });

  it('accepte encore un identifiant seul', () => {
    // L'ancienne signature reste appelable, pour ne casser aucun appel existant.
    expect(combinedSemitones('deep')).toBe(-5);
    expect(requiresPostProcessing('echo')).toBe(false);
    expect(requiresPostProcessing('helium')).toBe(true);
  });
});

describe('quels effets demandent un traitement après coup', () => {
  it('ne retient que les effets de hauteur', () => {
    // Les effets temps réel sont déjà dans le fichier enregistré.
    expect(requiresPostProcessing(['echo', 'robot', 'telephone'])).toBe(false);
    expect(requiresPostProcessing(['echo', 'deep'])).toBe(true);
    expect(requiresPostProcessing([])).toBe(false);
  });

  it('marque dans le catalogue exactement les effets de hauteur', () => {
    /*
     * `postProcess` sert à prévenir le joueur que l'effet ne s'entendra qu'après
     * l'arrêt. Il doit donc coïncider avec ce que le traitement fait réellement.
     */
    for (const entry of VOICE_FILTERS) {
      expect(
        requiresPostProcessing(entry.id),
        `${entry.id} : marquage incohérent`,
      ).toBe(Boolean(entry.postProcess));
    }
  });
});

describe('description d’un cumul', () => {
  it('rend les effets dans l’ordre choisi', () => {
    // L'ordre compte : les effets se traitent en série.
    const labels = describeFilters(['echo', 'deep']).map((entry) => entry.label);
    expect(labels).toEqual(['Écho', 'Grave']);
    expect(describeFilters(['deep', 'echo']).map((entry) => entry.label))
      .toEqual(['Grave', 'Écho']);
  });

  it('retombe sur « Naturel » quand rien n’est choisi', () => {
    expect(describeFilters([]).map((entry) => entry.id)).toEqual(['none']);
    expect(describeFilters(['none']).map((entry) => entry.id)).toEqual(['none']);
  });

  it('écarte un identifiant inconnu au lieu de trouer la liste', () => {
    const labels = describeFilters(['deep', 'inexistant' as VoiceFilterId]);
    expect(labels.map((entry) => entry.id)).toEqual(['deep']);
  });
});

describe('limite de cumul', () => {
  it('reste assez basse pour que chaque effet s’entende', () => {
    // Au-delà de trois, les effets se masquent et la voix devient une bouillie.
    expect(MAX_STACKED_FILTERS).toBeGreaterThanOrEqual(2);
    expect(MAX_STACKED_FILTERS).toBeLessThanOrEqual(4);
  });
});
