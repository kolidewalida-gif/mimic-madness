import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  NEUTRAL_PALETTE,
  activePalette,
  getActiveSfxMode,
  paletteFor,
  remapTargets,
  resetSfxModeForTests,
  resolveSampleName,
  setActiveSfxMode,
  sfxModes,
} from '@/lib/sfx/palette';

afterEach(() => resetSfxModeForTests());

const manifestIds = (): Set<string> => {
  const manifest = JSON.parse(
    readFileSync(resolve(process.cwd(), 'src/lib/sfx/manifest.json'), 'utf8')
      .replace(/^\uFEFF/, ''),
  );
  return new Set(manifest.samples.map((sample: { id: string }) => sample.id));
};

describe('palettes par mode', () => {
  it('couvre exactement les modes de jeu du projet', () => {
    /*
     * Les noms doivent rester alignés sur `GameMode` de `src/pages/Index.tsx`,
     * puisque c'est cette valeur qui est passée à `setActiveSfxMode`. Un écart
     * donnerait une palette introuvable, donc un son inchangé sans erreur.
     */
    expect(new Set(sfxModes())).toEqual(new Set([
      'normal', '2v2', 'quiz', 'audiophone', 'pixoguess',
      'monopoly', 'undercover', 'memorise', 'mimic',
    ]));
  });

  it('donne à chaque mode une signature qui lui est propre', () => {
    // C'est la demande de fond : deux modes ne doivent pas sonner pareil.
    const signatures = sfxModes().map((mode) => {
      const palette = paletteFor(mode);
      return `${palette.rate}|${palette.filter?.type}|${palette.filter?.frequency}|${palette.trim}`;
    });
    expect(new Set(signatures).size).toBe(signatures.length);
  });

  it('garde des valeurs musicalement raisonnables', () => {
    for (const mode of sfxModes()) {
      const palette = paletteFor(mode);
      // Au-delà de ±3 demi-tons environ, un son court devient méconnaissable.
      expect(palette.rate, `${mode} : hauteur trop extrême`).toBeGreaterThanOrEqual(0.85);
      expect(palette.rate, `${mode} : hauteur trop extrême`).toBeLessThanOrEqual(1.15);
      // Rien au-dessus du niveau nominal : un mode ne doit jamais saturer.
      expect(palette.trim, `${mode} : niveau trop fort`).toBeLessThanOrEqual(1.05);
      expect(palette.trim, `${mode} : niveau inaudible`).toBeGreaterThan(0.5);
      if (palette.filter) {
        expect(palette.filter.frequency).toBeGreaterThan(300);
        expect(palette.filter.frequency).toBeLessThan(20_000);
        expect(palette.filter.q).toBeGreaterThan(0);
      }
    }
  });

  it('explique l’intention de chaque palette', () => {
    // Sans intention écrite, un réglage chiffré devient intouchable : personne
    // ne sait plus ce qu'il cherchait à évoquer.
    for (const mode of sfxModes()) {
      expect(paletteFor(mode).intent.length, `${mode} sans intention`).toBeGreaterThan(10);
    }
  });

  it('adoucit Undercover et éclaircit le quiz', () => {
    // Deux directions opposées, vérifiées explicitement : c'est le cœur de la
    // demande, pas un détail de réglage.
    expect(paletteFor('undercover').trim).toBeLessThan(paletteFor('quiz').trim);
    expect(paletteFor('undercover').filter!.frequency)
      .toBeLessThan(paletteFor('quiz').filter!.frequency);
    expect(paletteFor('monopoly').rate).toBeLessThan(paletteFor('pixoguess').rate);
  });

  it('imite une bande téléphonique pour le mode audio', () => {
    // L'interface commente le principe du mode : le son passe par un téléphone.
    expect(paletteFor('audiophone').filter).toMatchObject({ type: 'bandpass' });
  });
});

describe('mode actif', () => {
  it('part sur la palette neutre hors partie', () => {
    expect(getActiveSfxMode()).toBeNull();
    expect(activePalette()).toBe(NEUTRAL_PALETTE);
  });

  it('suit le mode déclaré puis revient au neutre', () => {
    setActiveSfxMode('undercover');
    expect(activePalette()).toBe(paletteFor('undercover'));

    setActiveSfxMode(null);
    expect(activePalette()).toBe(NEUTRAL_PALETTE);
  });
});

describe('choix d’un autre échantillon selon le mode', () => {
  it('ne cible que des échantillons réellement présents', () => {
    /*
     * Garde-fou décisif : viser un identifiant absent du manifeste ferait
     * silencieusement retomber le son sur la synthèse, sans erreur visible.
     */
    const ids = manifestIds();
    for (const target of remapTargets()) {
      expect(ids.has(target), `cible inconnue : ${target}`).toBe(true);
    }
  });

  it('joue les sons dédiés du quiz à la place des génériques', () => {
    setActiveSfxMode('quiz');
    expect(resolveSampleName('success')).toBe('quiz-correct');
    expect(resolveSampleName('error')).toBe('quiz-wrong');
  });

  it('remplace les applaudissements par une révélation dans Undercover', () => {
    setActiveSfxMode('undercover');
    expect(resolveSampleName('celebration')).toBe('ui-reveal');
  });

  it('laisse le nom intact quand le mode n’a pas d’avis', () => {
    setActiveSfxMode('quiz');
    expect(resolveSampleName('hover')).toBe('hover');
  });

  it('laisse tout intact hors partie', () => {
    expect(resolveSampleName('success')).toBe('success');
  });

  it('accepte un mode explicite sans toucher au mode actif', () => {
    setActiveSfxMode('normal');
    expect(resolveSampleName('success', 'memorise')).toBe('ui-gem');
    expect(getActiveSfxMode()).toBe('normal');
  });
});
