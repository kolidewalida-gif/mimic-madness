/**
 * Mode AUDIO PHONE — scénarios de partie complète.
 *
 * Complète `audioPhoneLogic.test.ts` (règles unitaires) en enchaînant les
 * fonctions comme une vraie partie :
 *  - mécaniques : enregistrement de chaque joueur, imitations croisées
 *  - passage à la phrase suivante : progression et fin de chaîne
 *  - synchro entre joueurs : ordre de restitution déterministe
 *  - reconnexion : progression recalculable depuis les lignes SQL
 */
import { describe, expect, it } from 'vitest';
import {
  allImitationsForPhraseDone,
  allOriginalPhrasesSubmitted,
  canSubmitImitation,
  canSubmitOriginalPhrase,
  computeNextPhraseIndex,
  computePhraseProgress,
  computePlayerOrderIndex,
  getPendingOriginalPlayers,
  getPlayersToImitate,
  isValidPhaseTransition,
  playerHasSubmitted,
  shouldImitate,
  sortRecordingsByOrder,
  type AudioPhonePhase,
} from '@/lib/audioPhoneLogic';

const players = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: `j${i + 1}`, name: `Joueur ${i + 1}` }));

const recording = (playerId: string, orderIndex: number) => ({
  id: `rec-${playerId}`,
  player_id: playerId,
  player_order_index: orderIndex,
});

const imitation = (originalId: string, imitatorId: string) => ({
  id: `im-${originalId}-${imitatorId}`,
  original_recording_id: originalId,
  imitator_player_id: imitatorId,
});

const ALL_PHASES: AudioPhonePhase[] = [
  'instructions', 'recording_all', 'reversing', 'imitation',
  'waiting_reveal', 'reveal', 'scores', 'finished',
];

// ── 1. Phase d'enregistrement ──────────────────────────────────────────────

describe('audiophone — phase d’enregistrement', () => {
  it('autorise un joueur qui n’a pas encore enregistré', () => {
    expect(
      canSubmitOriginalPhrase({ phase: 'recording_all', playerId: 'j1', recordings: [] }),
    ).toBe(true);
  });

  it('refuse un second enregistrement du même joueur', () => {
    expect(
      canSubmitOriginalPhrase({
        phase: 'recording_all',
        playerId: 'j1',
        recordings: [recording('j1', 0)],
      }),
    ).toBe(false);
  });

  it('autorise encore un joueur quand un autre a déjà enregistré', () => {
    expect(
      canSubmitOriginalPhrase({
        phase: 'recording_all',
        playerId: 'j2',
        recordings: [recording('j1', 0)],
      }),
    ).toBe(true);
  });

  it('refuse l’enregistrement hors de la bonne phase', () => {
    for (const phase of ALL_PHASES.filter((p) => p !== 'recording_all')) {
      expect(canSubmitOriginalPhrase({ phase, playerId: 'j1', recordings: [] })).toBe(false);
    }
  });

  it('détecte qu’il manque des enregistrements', () => {
    expect(allOriginalPhrasesSubmitted(players(3), [recording('j1', 0)])).toBe(false);
  });

  it('détecte que tout le monde a enregistré', () => {
    const list = players(3);
    const recordings = list.map((p, i) => recording(p.id, i));
    expect(allOriginalPhrasesSubmitted(list, recordings)).toBe(true);
  });

  it('refuse de valider un lobby vide', () => {
    expect(allOriginalPhrasesSubmitted([], [])).toBe(false);
  });

  it('liste les joueurs encore attendus', () => {
    const list = players(3);
    expect(getPendingOriginalPlayers(list, [recording('j1', 0)]).map((p) => p.id))
      .toEqual(['j2', 'j3']);
  });

  it('ne liste plus personne quand tout est enregistré', () => {
    const list = players(3);
    const recordings = list.map((p, i) => recording(p.id, i));
    expect(getPendingOriginalPlayers(list, recordings)).toEqual([]);
  });

  it('reconnaît un joueur ayant déjà enregistré', () => {
    expect(playerHasSubmitted('j1', [recording('j1', 0)])).toBe(true);
  });

  it('reconnaît un joueur n’ayant pas enregistré', () => {
    expect(playerHasSubmitted('j2', [recording('j1', 0)])).toBe(false);
  });

  it('attribue un index d’ordre à chaque joueur', () => {
    const order = ['j1', 'j2', 'j3'];
    expect(order.map((id) => computePlayerOrderIndex(order, id))).toEqual([0, 1, 2]);
  });

  it('renvoie moins un pour un joueur absent de l’ordre', () => {
    expect(computePlayerOrderIndex(['j1', 'j2'], 'j9')).toBe(-1);
  });
});

// ── 2. Phase d'imitation ───────────────────────────────────────────────────

describe('audiophone — phase d’imitation', () => {
  it('interdit à l’auteur d’imiter sa propre phrase', () => {
    expect(
      canSubmitImitation({
        phase: 'imitation',
        playerId: 'j1',
        originalRecordingId: 'rec-j1',
        originalAuthorId: 'j1',
        imitations: [],
      }),
    ).toBe(false);
  });

  it('autorise un autre joueur à imiter', () => {
    expect(
      canSubmitImitation({
        phase: 'imitation',
        playerId: 'j2',
        originalRecordingId: 'rec-j1',
        originalAuthorId: 'j1',
        imitations: [],
      }),
    ).toBe(true);
  });

  it('refuse une seconde imitation de la même phrase', () => {
    expect(
      canSubmitImitation({
        phase: 'imitation',
        playerId: 'j2',
        originalRecordingId: 'rec-j1',
        originalAuthorId: 'j1',
        imitations: [imitation('rec-j1', 'j2')],
      }),
    ).toBe(false);
  });

  it('autorise l’imitation d’une autre phrase par le même joueur', () => {
    expect(
      canSubmitImitation({
        phase: 'imitation',
        playerId: 'j2',
        originalRecordingId: 'rec-j3',
        originalAuthorId: 'j3',
        imitations: [imitation('rec-j1', 'j2')],
      }),
    ).toBe(true);
  });

  it('refuse l’imitation hors de la bonne phase', () => {
    for (const phase of ALL_PHASES.filter((p) => p !== 'imitation')) {
      expect(
        canSubmitImitation({
          phase,
          playerId: 'j2',
          originalRecordingId: 'rec-j1',
          originalAuthorId: 'j1',
          imitations: [],
        }),
      ).toBe(false);
    }
  });

  it('désigne tous les joueurs sauf l’auteur', () => {
    expect(getPlayersToImitate(players(4), 'j2').map((p) => p.id)).toEqual(['j1', 'j3', 'j4']);
  });

  it('ne désigne personne dans un duo où l’autre est l’auteur', () => {
    expect(getPlayersToImitate([{ id: 'j1' }], 'j1')).toEqual([]);
  });

  it('indique qu’un joueur doit encore imiter', () => {
    expect(
      shouldImitate({
        playerId: 'j2',
        originalAuthorId: 'j1',
        originalRecordingId: 'rec-j1',
        imitations: [],
      }),
    ).toBe(true);
  });

  it('indique qu’un joueur a déjà imité', () => {
    expect(
      shouldImitate({
        playerId: 'j2',
        originalAuthorId: 'j1',
        originalRecordingId: 'rec-j1',
        imitations: [imitation('rec-j1', 'j2')],
      }),
    ).toBe(false);
  });

  it('n’attend jamais l’auteur', () => {
    expect(
      shouldImitate({
        playerId: 'j1',
        originalAuthorId: 'j1',
        originalRecordingId: 'rec-j1',
        imitations: [],
      }),
    ).toBe(false);
  });

  it('détecte une phrase encore incomplète', () => {
    expect(
      allImitationsForPhraseDone({
        players: players(3),
        originalAuthorId: 'j1',
        originalRecordingId: 'rec-j1',
        imitations: [imitation('rec-j1', 'j2')],
      }),
    ).toBe(false);
  });

  it('détecte une phrase entièrement imitée', () => {
    expect(
      allImitationsForPhraseDone({
        players: players(3),
        originalAuthorId: 'j1',
        originalRecordingId: 'rec-j1',
        imitations: [imitation('rec-j1', 'j2'), imitation('rec-j1', 'j3')],
      }),
    ).toBe(true);
  });

  it('ignore les imitations d’une autre phrase', () => {
    expect(
      allImitationsForPhraseDone({
        players: players(3),
        originalAuthorId: 'j1',
        originalRecordingId: 'rec-j1',
        imitations: [imitation('rec-j2', 'j2'), imitation('rec-j2', 'j3')],
      }),
    ).toBe(false);
  });

  it('considère une phrase sans imitateur possible comme terminée', () => {
    expect(
      allImitationsForPhraseDone({
        players: [{ id: 'j1' }],
        originalAuthorId: 'j1',
        originalRecordingId: 'rec-j1',
        imitations: [],
      }),
    ).toBe(true);
  });
});

// ── 3. Progression d'une phrase ────────────────────────────────────────────

describe('audiophone — progression d’une phrase', () => {
  it('compte les imitations attendues', () => {
    const progress = computePhraseProgress({
      players: players(4),
      originalAuthorId: 'j1',
      originalRecordingId: 'rec-j1',
      imitations: [],
    });
    expect(progress.requiredCount).toBe(3);
  });

  it('compte les imitations reçues', () => {
    const progress = computePhraseProgress({
      players: players(4),
      originalAuthorId: 'j1',
      originalRecordingId: 'rec-j1',
      imitations: [imitation('rec-j1', 'j2'), imitation('rec-j1', 'j3')],
    });
    expect(progress.completedCount).toBe(2);
  });

  it('liste les joueurs encore attendus', () => {
    const progress = computePhraseProgress({
      players: players(4),
      originalAuthorId: 'j1',
      originalRecordingId: 'rec-j1',
      imitations: [imitation('rec-j1', 'j2')],
    });
    expect(progress.pendingPlayerIds).toEqual(['j3', 'j4']);
  });

  it('n’attend plus personne quand tout est reçu', () => {
    const progress = computePhraseProgress({
      players: players(3),
      originalAuthorId: 'j1',
      originalRecordingId: 'rec-j1',
      imitations: [imitation('rec-j1', 'j2'), imitation('rec-j1', 'j3')],
    });
    expect(progress.pendingPlayerIds).toEqual([]);
    expect(progress.completedCount).toBe(progress.requiredCount);
  });

  it('renvoie une progression vide sans phrase courante', () => {
    expect(
      computePhraseProgress({
        players: players(3),
        originalAuthorId: null,
        originalRecordingId: null,
        imitations: [],
      }),
    ).toEqual({ requiredCount: 0, completedCount: 0, pendingPlayerIds: [] });
  });

  it('renvoie une progression vide sans auteur', () => {
    expect(
      computePhraseProgress({
        players: players(3),
        originalAuthorId: null,
        originalRecordingId: 'rec-j1',
        imitations: [],
      }).requiredCount,
    ).toBe(0);
  });

  it('ne compte pas deux fois la même imitation', () => {
    const progress = computePhraseProgress({
      players: players(3),
      originalAuthorId: 'j1',
      originalRecordingId: 'rec-j1',
      imitations: [imitation('rec-j1', 'j2'), imitation('rec-j1', 'j2')],
    });
    expect(progress.completedCount).toBe(1);
  });

  it('donne la même progression à tous les joueurs', () => {
    const params = {
      players: players(4),
      originalAuthorId: 'j1',
      originalRecordingId: 'rec-j1',
      imitations: [imitation('rec-j1', 'j3')],
    };
    expect(computePhraseProgress(params)).toEqual(computePhraseProgress(params));
  });
});

// ── 4. Passage à la phrase suivante ────────────────────────────────────────

describe('audiophone — passage à la phrase suivante', () => {
  it('avance à la phrase suivante', () => {
    expect(computeNextPhraseIndex(0, 3)).toBe(1);
  });

  it('avance jusqu’à la dernière phrase', () => {
    expect(computeNextPhraseIndex(1, 3)).toBe(2);
  });

  it('signale la fin de la chaîne', () => {
    expect(computeNextPhraseIndex(2, 3)).toBe(-1);
  });

  it('signale la fin quand il n’y a qu’une phrase', () => {
    expect(computeNextPhraseIndex(0, 1)).toBe(-1);
  });

  it('signale la fin sans aucune phrase', () => {
    expect(computeNextPhraseIndex(0, 0)).toBe(-1);
  });

  it('parcourt toute la chaîne sans en sauter une', () => {
    const total = 4;
    const visited: number[] = [];
    let index = 0;
    while (index !== -1) {
      visited.push(index);
      index = computeNextPhraseIndex(index, total);
    }
    expect(visited).toEqual([0, 1, 2, 3]);
  });

  it('ordonne la restitution par index de joueur', () => {
    const recordings = [recording('j3', 2), recording('j1', 0), recording('j2', 1)];
    expect(sortRecordingsByOrder(recordings).map((r) => r.player_id))
      .toEqual(['j1', 'j2', 'j3']);
  });

  it('n’altère pas la liste reçue en la triant', () => {
    const recordings = [recording('j2', 1), recording('j1', 0)];
    const copy = [...recordings];
    sortRecordingsByOrder(recordings);
    expect(recordings).toEqual(copy);
  });

  it('donne le même ordre de restitution à tous les joueurs', () => {
    const a = [recording('j3', 2), recording('j1', 0), recording('j2', 1)];
    const b = [recording('j1', 0), recording('j2', 1), recording('j3', 2)];
    expect(sortRecordingsByOrder(a).map((r) => r.id))
      .toEqual(sortRecordingsByOrder(b).map((r) => r.id));
  });

  it('gère une liste vide au tri', () => {
    expect(sortRecordingsByOrder([])).toEqual([]);
  });
});

// ── 5. Machine à états ─────────────────────────────────────────────────────

describe('audiophone — machine à états', () => {
  it('démarre des instructions vers l’enregistrement', () => {
    expect(isValidPhaseTransition('instructions', 'recording_all')).toBe(true);
  });

  it('passe de l’enregistrement au retournement audio', () => {
    expect(isValidPhaseTransition('recording_all', 'reversing')).toBe(true);
  });

  it('permet de sauter le retournement', () => {
    expect(isValidPhaseTransition('recording_all', 'imitation')).toBe(true);
  });

  it('passe du retournement à l’imitation', () => {
    expect(isValidPhaseTransition('reversing', 'imitation')).toBe(true);
  });

  it('passe de l’imitation à l’attente de restitution', () => {
    expect(isValidPhaseTransition('imitation', 'waiting_reveal')).toBe(true);
  });

  it('passe de l’attente à la restitution', () => {
    expect(isValidPhaseTransition('waiting_reveal', 'reveal')).toBe(true);
  });

  it('passe de la restitution aux scores', () => {
    expect(isValidPhaseTransition('reveal', 'scores')).toBe(true);
  });

  it('permet de terminer directement depuis la restitution', () => {
    expect(isValidPhaseTransition('reveal', 'finished')).toBe(true);
  });

  it('passe des scores à la fin', () => {
    expect(isValidPhaseTransition('scores', 'finished')).toBe(true);
  });

  it('traite la fin comme terminale', () => {
    for (const phase of ALL_PHASES) {
      expect(isValidPhaseTransition('finished', phase)).toBe(false);
    }
  });

  it('refuse tout retour en arrière', () => {
    expect(isValidPhaseTransition('imitation', 'recording_all')).toBe(false);
    expect(isValidPhaseTransition('reveal', 'imitation')).toBe(false);
    expect(isValidPhaseTransition('scores', 'reveal')).toBe(false);
  });

  it('refuse de sauter l’imitation', () => {
    expect(isValidPhaseTransition('recording_all', 'reveal')).toBe(false);
  });

  it('refuse une transition d’une phase vers elle-même', () => {
    for (const phase of ALL_PHASES) {
      expect(isValidPhaseTransition(phase, phase)).toBe(false);
    }
  });

  it('permet d’enchaîner tout le déroulé nominal', () => {
    const path: AudioPhonePhase[] = [
      'instructions', 'recording_all', 'reversing', 'imitation',
      'waiting_reveal', 'reveal', 'scores', 'finished',
    ];
    for (let i = 1; i < path.length; i += 1) {
      expect(isValidPhaseTransition(path[i - 1], path[i])).toBe(true);
    }
  });
});

// ── 6. Partie complète et reconnexion ──────────────────────────────────────

describe('audiophone — partie complète', () => {
  it('déroule une partie de trois joueurs de bout en bout', () => {
    const list = players(3);
    const order = list.map((p) => p.id);

    // Phase 1 : chacun enregistre.
    const recordings = list.map((p) => recording(p.id, computePlayerOrderIndex(order, p.id)));
    expect(allOriginalPhrasesSubmitted(list, recordings)).toBe(true);

    // Phase 2 : chaque phrase est imitée par les deux autres.
    const imitations: ReturnType<typeof imitation>[] = [];
    const ordered = sortRecordingsByOrder(recordings);
    let phraseIndex = 0;
    while (phraseIndex !== -1) {
      const current = ordered[phraseIndex];
      for (const p of getPlayersToImitate(list, current.player_id)) {
        expect(
          shouldImitate({
            playerId: p.id,
            originalAuthorId: current.player_id,
            originalRecordingId: current.id,
            imitations,
          }),
        ).toBe(true);
        imitations.push(imitation(current.id, p.id));
      }
      expect(
        allImitationsForPhraseDone({
          players: list,
          originalAuthorId: current.player_id,
          originalRecordingId: current.id,
          imitations,
        }),
      ).toBe(true);
      phraseIndex = computeNextPhraseIndex(phraseIndex, ordered.length);
    }

    // Trois phrases x deux imitateurs = six imitations.
    expect(imitations).toHaveLength(6);
  });

  it('n’attribue jamais à un joueur l’imitation de sa propre phrase', () => {
    const list = players(4);
    const recordings = list.map((p, i) => recording(p.id, i));
    for (const rec of recordings) {
      expect(getPlayersToImitate(list, rec.player_id).map((p) => p.id))
        .not.toContain(rec.player_id);
    }
  });

  it('recalcule la progression après reconnexion', () => {
    const list = players(4);
    // Lignes telles que relues en base après reconnexion.
    const imitations = [imitation('rec-j1', 'j2'), imitation('rec-j1', 'j4')];
    const progress = computePhraseProgress({
      players: list,
      originalAuthorId: 'j1',
      originalRecordingId: 'rec-j1',
      imitations,
    });
    expect(progress.completedCount).toBe(2);
    expect(progress.pendingPlayerIds).toEqual(['j3']);
  });

  it('empêche un doublon après une reconnexion qui rejoue une soumission', () => {
    const imitations = [imitation('rec-j1', 'j2')];
    expect(
      canSubmitImitation({
        phase: 'imitation',
        playerId: 'j2',
        originalRecordingId: 'rec-j1',
        originalAuthorId: 'j1',
        imitations,
      }),
    ).toBe(false);
  });

  it('empêche un doublon d’enregistrement après reconnexion', () => {
    expect(
      canSubmitOriginalPhrase({
        phase: 'recording_all',
        playerId: 'j1',
        recordings: [recording('j1', 0)],
      }),
    ).toBe(false);
  });

  it('reste cohérent avec un grand nombre de joueurs', () => {
    const list = players(8);
    const recordings = list.map((p, i) => recording(p.id, i));
    expect(allOriginalPhrasesSubmitted(list, recordings)).toBe(true);
    expect(getPlayersToImitate(list, 'j1')).toHaveLength(7);
    expect(sortRecordingsByOrder(recordings).map((r) => r.player_order_index))
      .toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
});
