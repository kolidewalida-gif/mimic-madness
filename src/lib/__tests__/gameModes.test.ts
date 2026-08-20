import { describe, expect, it } from 'vitest';
import {
  GAME_MODE_META,
  getStartStatus,
  soloBotCount,
  type LobbyGameMode,
} from '@/lib/gameModes';

describe('bots du solo administrateur', () => {
  it('n’ajoute aucun bot au mode Imitation', () => {
    /*
     * Régression vécue : un bot était ajouté pour un admin seul. Le mode
     * Imitation n'a aucun pilote automatique, donc ce bot ne soumettait jamais de
     * défi et ne se déclarait jamais prêt. Il gelait successivement le bouton
     * « Lancer la Partie » (`allPlayersSubmitted`), la phase d'aperçu puis la
     * phase d'imitation — chacune exigeant que *tous* les joueurs répondent.
     */
    expect(soloBotCount('normal')).toBe(0);
  });

  it('conserve les effectifs des modes pilotés par un automate', () => {
    // Undercover et Monopoly font réellement jouer leurs bots : ne rien changer.
    expect(soloBotCount('undercover')).toBe(2);
    expect(soloBotCount('monopoly')).toBe(1);
  });

  it('conserve les effectifs de tous les autres modes', () => {
    // Garde-fou : la correction ne doit toucher que le mode Imitation.
    expect(soloBotCount('2v2')).toBe(3);
    expect(soloBotCount('quiz')).toBe(1);
    expect(soloBotCount('audiophone')).toBe(1);
    expect(soloBotCount('pixoguess')).toBe(1);
    expect(soloBotCount('memorise')).toBe(1);
    expect(soloBotCount('mimic')).toBe(1);
  });

  it('répond pour chaque mode déclaré', () => {
    const modes = Object.keys(GAME_MODE_META) as LobbyGameMode[];
    for (const mode of modes) {
      const count = soloBotCount(mode);
      expect(Number.isInteger(count)).toBe(true);
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('démarrage en solo du mode Imitation', () => {
  it('autorise un administrateur seul', () => {
    const status = getStartStatus({ mode: 'normal', connectedCount: 1, isAdmin: true });
    expect(status.canStart).toBe(true);
    expect(status.reasons).toEqual([]);
  });

  it('continue de refuser un joueur seul non administrateur', () => {
    // Le solo est une facilité d'administration, pas une ouverture générale.
    const status = getStartStatus({ mode: 'normal', connectedCount: 1 });
    expect(status.canStart).toBe(false);
    expect(status.reasons).toEqual(['Il faut au moins 2 joueurs connectés.']);
  });
});
