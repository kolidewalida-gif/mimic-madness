import { describe, expect, it } from 'vitest';
import {
  canLeaveImitationPhase,
  canLeavePreviewPhase,
  deliveredPlayerIds,
  hasDeliveredImitation,
  hasSeenPreview,
  previewSeenPlayerIds,
} from '@/lib/imitationReadiness';

const players = [{ id: 'j1' }, { id: 'j2' }, { id: 'j3' }];

describe('imitation réellement rendue', () => {
  it('reconnaît une imitation avec son clip', () => {
    expect(hasDeliveredImitation({ player_id: 'j1', is_ready: true, clip_id: 'clip-1', skipped: false }))
      .toBe(true);
  });

  it('refuse une ligne prête sans clip', () => {
    /*
     * Le cœur du bug : l'aperçu écrivait `is_ready = true` pour dire « j'ai vu
     * la vidéo ». S'en contenter faisait avancer la manche alors que personne
     * n'avait imité.
     */
    expect(hasDeliveredImitation({ player_id: 'j1', is_ready: true, clip_id: null, skipped: false }))
      .toBe(false);
  });

  it('accepte un saut assumé par l’hôte', () => {
    // Débloquer une manche reste possible, mais c'est maintenant explicite.
    expect(hasDeliveredImitation({ player_id: 'j1', is_ready: true, clip_id: null, skipped: true }))
      .toBe(true);
  });

  it('refuse une ligne pas prête, même avec un clip', () => {
    // Un clip enregistré mais jamais soumis ne compte pas.
    expect(hasDeliveredImitation({ player_id: 'j1', is_ready: false, clip_id: 'clip-1' }))
      .toBe(false);
  });

  it('traite une chaîne vide comme une absence de clip', () => {
    expect(hasDeliveredImitation({ player_id: 'j1', is_ready: true, clip_id: '', skipped: false }))
      .toBe(false);
  });

  it('tolère un schéma antérieur au correctif', () => {
    // `skipped` absent : on retombe sur l'ancien comportement plutôt que de
    // bloquer définitivement une manche sur une base plus vieille que le code.
    expect(hasDeliveredImitation({ player_id: 'j1', is_ready: true })).toBe(true);
  });

  it('ne retient que les joueurs ayant rendu, dans l’ordre', () => {
    expect(
      deliveredPlayerIds([
        { player_id: 'j1', is_ready: true, clip_id: 'a', skipped: false },
        { player_id: 'j2', is_ready: true, clip_id: null, skipped: false },
        { player_id: 'j3', is_ready: true, clip_id: null, skipped: true },
      ]),
    ).toEqual(['j1', 'j3']);
  });
});

describe('aperçu vu', () => {
  it('lit `has_seen_preview` et rien d’autre', () => {
    expect(hasSeenPreview({ player_id: 'j1', has_seen_preview: true })).toBe(true);
    expect(hasSeenPreview({ player_id: 'j1', has_seen_preview: false })).toBe(false);
  });

  it('ne confond jamais une imitation rendue avec un aperçu vu', () => {
    // Les deux sens sont désormais indépendants : c'est tout l'objet du correctif.
    expect(hasSeenPreview({ player_id: 'j1', is_ready: true, clip_id: 'clip-1' })).toBe(false);
  });

  it('ne considère pas comme prêt un joueur ayant seulement vu l’aperçu', () => {
    expect(hasDeliveredImitation({ player_id: 'j1', has_seen_preview: true, is_ready: false }))
      .toBe(false);
  });

  it('ne retient que les joueurs ayant vu', () => {
    expect(
      previewSeenPlayerIds([
        { player_id: 'j1', has_seen_preview: true },
        { player_id: 'j2', has_seen_preview: false },
      ]),
    ).toEqual(['j1']);
  });
});

describe('sortie de la phase d’imitation', () => {
  it('attend que chaque joueur connecté ait rendu', () => {
    const rows = [
      { player_id: 'j1', is_ready: true, clip_id: 'a', skipped: false },
      { player_id: 'j2', is_ready: true, clip_id: 'b', skipped: false },
    ];
    expect(canLeaveImitationPhase(players, rows)).toBe(false);

    expect(
      canLeaveImitationPhase(players, [
        ...rows,
        { player_id: 'j3', is_ready: true, clip_id: 'c', skipped: false },
      ]),
    ).toBe(true);
  });

  it('ne quitte pas la phase sur des lignes prêtes sans clip', () => {
    // Reproduit exactement la manche qui se terminait sans que personne n'imite.
    const rows = players.map((player) => ({
      player_id: player.id,
      is_ready: true,
      clip_id: null,
      skipped: false,
    }));
    expect(canLeaveImitationPhase(players, rows)).toBe(false);
  });

  it('refuse d’avancer quand la liste des joueurs est vide', () => {
    /*
     * `[].every(...)` vaut `true` : sans garde explicite, la manche avançait
     * avant même que la liste des joueurs soit chargée.
     */
    expect(canLeaveImitationPhase([], [])).toBe(false);
  });

  it('ignore la ligne d’un joueur parti', () => {
    // Un déconnecté quitte `players` mais garde sa ligne : un décompte
    // n'aurait jamais correspondu et l'hôte serait resté bloqué.
    const rows = [
      { player_id: 'j1', is_ready: true, clip_id: 'a', skipped: false },
      { player_id: 'parti', is_ready: true, clip_id: 'z', skipped: false },
    ];
    expect(canLeaveImitationPhase([{ id: 'j1' }], rows)).toBe(true);
  });

  it('laisse l’hôte débloquer une manche avec des sauts', () => {
    const rows = [
      { player_id: 'j1', is_ready: true, clip_id: 'a', skipped: false },
      { player_id: 'j2', is_ready: true, clip_id: null, skipped: true },
      { player_id: 'j3', is_ready: true, clip_id: null, skipped: true },
    ];
    expect(canLeaveImitationPhase(players, rows)).toBe(true);
  });
});

describe('sortie de la phase d’aperçu', () => {
  it('attend que chaque joueur ait vu la vidéo', () => {
    const rows = [
      { player_id: 'j1', has_seen_preview: true },
      { player_id: 'j2', has_seen_preview: true },
    ];
    expect(canLeavePreviewPhase(players, rows)).toBe(false);
    expect(
      canLeavePreviewPhase(players, [...rows, { player_id: 'j3', has_seen_preview: true }]),
    ).toBe(true);
  });

  it('ne se satisfait pas d’imitations rendues', () => {
    // Symétrie du correctif : l'aperçu ne lit pas `is_ready` non plus.
    const rows = players.map((player) => ({
      player_id: player.id,
      is_ready: true,
      clip_id: 'x',
    }));
    expect(canLeavePreviewPhase(players, rows)).toBe(false);
  });

  it('refuse d’avancer quand la liste des joueurs est vide', () => {
    expect(canLeavePreviewPhase([], [])).toBe(false);
  });
});
