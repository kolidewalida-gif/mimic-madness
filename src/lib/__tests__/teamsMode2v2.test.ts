/**
 * Mode 2 VS 2 — couverture complète.
 *
 *  - mécaniques : effectif requis, appariement deux par deux, mélange uniforme
 *  - synchro entre joueurs : mêmes équipes chez tout le monde, lignes dupliquées
 *  - passage à la manche suivante : équipes complètes avant démarrage
 *  - reconnexion : lignes realtime rejouées, ordre SQL non garanti
 */
import { describe, expect, it } from 'vitest';
import {
  MIN_2V2_PLAYERS,
  TEAM_SIZE,
  areTeammates,
  areTeamsComplete,
  buildTeamAssignments,
  findOpposingTeams,
  findPlayerTeam,
  findTeammate,
  groupTeamRows,
  shufflePlayers,
  validateTeamFormation,
  type Team,
  type TeamPlayer,
  type TeamRow,
} from '@/lib/teamsLogic';
import { getStartStatus } from '@/lib/gameModes';

const player = (id: string, name = `Joueur ${id}`): TeamPlayer => ({ id, name });

const row = (teamNumber: number, playerId: string, playerName = `Joueur ${playerId}`): TeamRow => ({
  team_number: teamNumber,
  player_id: playerId,
  player_name: playerName,
});

const fourPlayers = [player('a'), player('b'), player('c'), player('d')];

const twoTeams: Team[] = [
  { teamNumber: 1, players: [player('a'), player('b')] },
  { teamNumber: 2, players: [player('c'), player('d')] },
];

/** Générateur déterministe : rend les mélanges reproductibles dans les tests. */
const sequence = (values: number[]): (() => number) => {
  let index = 0;
  return () => values[index++ % values.length];
};

// ── 1. Effectif requis ─────────────────────────────────────────────────────

describe('2v2 — effectif requis', () => {
  it('fixe la taille d’équipe à deux', () => {
    expect(TEAM_SIZE).toBe(2);
  });

  it('exige quatre joueurs minimum', () => {
    expect(MIN_2V2_PLAYERS).toBe(4);
  });

  it('accepte exactement quatre joueurs', () => {
    expect(validateTeamFormation(4)).toEqual({ ok: true });
  });

  it('accepte six joueurs', () => {
    expect(validateTeamFormation(6).ok).toBe(true);
  });

  it('accepte huit joueurs', () => {
    expect(validateTeamFormation(8).ok).toBe(true);
  });

  it('accepte un grand effectif pair', () => {
    expect(validateTeamFormation(20).ok).toBe(true);
  });

  it('refuse trois joueurs', () => {
    expect(validateTeamFormation(3).ok).toBe(false);
  });

  it('refuse deux joueurs', () => {
    expect(validateTeamFormation(2).ok).toBe(false);
  });

  it('refuse un lobby vide', () => {
    expect(validateTeamFormation(0).ok).toBe(false);
  });

  it('refuse un effectif négatif', () => {
    expect(validateTeamFormation(-2).ok).toBe(false);
  });

  it('refuse cinq joueurs pour cause d’impair', () => {
    const check = validateTeamFormation(5);
    expect(check.ok).toBe(false);
    expect(check.reason).toContain('pair');
  });

  it('refuse sept joueurs pour cause d’impair', () => {
    expect(validateTeamFormation(7).ok).toBe(false);
  });

  it('explique le minimum quand l’effectif est trop faible', () => {
    expect(validateTeamFormation(1).reason).toContain('4 joueurs');
  });

  it('refuse un effectif décimal', () => {
    expect(validateTeamFormation(4.5).ok).toBe(false);
  });

  it('ne renvoie aucune raison quand la formation est valide', () => {
    expect(validateTeamFormation(4).reason).toBeUndefined();
  });

  it('priorise le minimum sur la parité quand les deux échouent', () => {
    expect(validateTeamFormation(3).reason).toContain('4 joueurs');
  });
});

// ── 2. Conditions de démarrage du lobby ────────────────────────────────────

describe('2v2 — conditions de démarrage du lobby', () => {
  it('bloque le démarrage sans assez de joueurs connectés', () => {
    const status = getStartStatus({ mode: '2v2', connectedCount: 3, teamsCount: 0 });
    expect(status.canStart).toBe(false);
  });

  it('bloque le démarrage tant que les équipes ne sont pas formées', () => {
    const status = getStartStatus({ mode: '2v2', connectedCount: 4, teamsCount: 0 });
    expect(status.canStart).toBe(false);
    expect(status.reasons.join(' ')).toContain('équipes');
  });

  it('autorise le démarrage à quatre joueurs avec deux équipes', () => {
    expect(getStartStatus({ mode: '2v2', connectedCount: 4, teamsCount: 2 }).canStart).toBe(true);
  });

  it('bloque le démarrage sur un effectif impair', () => {
    const status = getStartStatus({ mode: '2v2', connectedCount: 5, teamsCount: 2 });
    expect(status.canStart).toBe(false);
    expect(status.reasons.join(' ')).toContain('pair');
  });

  it('cumule les raisons de blocage', () => {
    const status = getStartStatus({ mode: '2v2', connectedCount: 3, teamsCount: 0 });
    expect(status.reasons.length).toBeGreaterThan(1);
  });

  it('laisse un admin forcer le démarrage', () => {
    const status = getStartStatus({ mode: '2v2', connectedCount: 1, teamsCount: 0, isAdmin: true });
    expect(status.canStart).toBe(true);
    expect(status.reasons).toEqual([]);
  });

  it('autorise six joueurs avec trois équipes', () => {
    expect(getStartStatus({ mode: '2v2', connectedCount: 6, teamsCount: 3 }).canStart).toBe(true);
  });

  it('n’exige pas d’équipes dans le mode imitation', () => {
    expect(getStartStatus({ mode: 'normal', connectedCount: 2, teamsCount: 0 }).canStart).toBe(true);
  });

  it('bloque le mode imitation sous deux joueurs', () => {
    expect(getStartStatus({ mode: 'normal', connectedCount: 1 }).canStart).toBe(false);
  });

  it('traite teamsCount absent comme aucune équipe', () => {
    expect(getStartStatus({ mode: '2v2', connectedCount: 4 }).canStart).toBe(false);
  });
});

// ── 3. Appariement en équipes ──────────────────────────────────────────────

describe('2v2 — appariement en équipes', () => {
  it('forme deux équipes avec quatre joueurs', () => {
    const assignments = buildTeamAssignments('lobby-1', fourPlayers);
    expect(assignments).toHaveLength(4);
    expect(new Set(assignments.map((a) => a.team_number))).toEqual(new Set([1, 2]));
  });

  it('numérote les équipes à partir de un', () => {
    const assignments = buildTeamAssignments('lobby-1', fourPlayers);
    expect(assignments[0].team_number).toBe(1);
  });

  it('place les deux premiers joueurs dans l’équipe 1', () => {
    const assignments = buildTeamAssignments('lobby-1', fourPlayers);
    const team1 = assignments.filter((a) => a.team_number === 1).map((a) => a.player_id);
    expect(team1).toEqual(['a', 'b']);
  });

  it('place les deux suivants dans l’équipe 2', () => {
    const assignments = buildTeamAssignments('lobby-1', fourPlayers);
    const team2 = assignments.filter((a) => a.team_number === 2).map((a) => a.player_id);
    expect(team2).toEqual(['c', 'd']);
  });

  it('propage le lobby sur chaque affectation', () => {
    const assignments = buildTeamAssignments('lobby-42', fourPlayers);
    expect(assignments.every((a) => a.lobby_id === 'lobby-42')).toBe(true);
  });

  it('conserve le nom de chaque joueur', () => {
    const assignments = buildTeamAssignments('lobby-1', [player('a', 'Alice'), player('b', 'Bob')]);
    expect(assignments.map((a) => a.player_name)).toEqual(['Alice', 'Bob']);
  });

  it('forme trois équipes avec six joueurs', () => {
    const six = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => player(id));
    const assignments = buildTeamAssignments('lobby-1', six);
    expect(new Set(assignments.map((a) => a.team_number)).size).toBe(3);
  });

  it('forme cinq équipes avec dix joueurs', () => {
    const ten = Array.from({ length: 10 }, (_, i) => player(String(i)));
    const assignments = buildTeamAssignments('lobby-1', ten);
    expect(new Set(assignments.map((a) => a.team_number)).size).toBe(5);
  });

  it('affecte chaque joueur exactement une fois', () => {
    const eight = Array.from({ length: 8 }, (_, i) => player(String(i)));
    const assignments = buildTeamAssignments('lobby-1', eight);
    expect(new Set(assignments.map((a) => a.player_id)).size).toBe(8);
  });

  it('met exactement deux joueurs par équipe', () => {
    const eight = Array.from({ length: 8 }, (_, i) => player(String(i)));
    const assignments = buildTeamAssignments('lobby-1', eight);
    const counts = new Map<number, number>();
    for (const a of assignments) counts.set(a.team_number, (counts.get(a.team_number) ?? 0) + 1);
    expect([...counts.values()].every((count) => count === 2)).toBe(true);
  });

  it('ne renvoie rien pour une liste vide', () => {
    expect(buildTeamAssignments('lobby-1', [])).toEqual([]);
  });

  it('laisse un joueur seul plutôt que de l’exclure sur un effectif impair', () => {
    const assignments = buildTeamAssignments('lobby-1', [player('a'), player('b'), player('c')]);
    expect(assignments).toHaveLength(3);
    expect(assignments.filter((a) => a.team_number === 2)).toHaveLength(1);
  });

  it('gère un seul joueur sans planter', () => {
    const assignments = buildTeamAssignments('lobby-1', [player('a')]);
    expect(assignments).toEqual([
      { lobby_id: 'lobby-1', team_number: 1, player_id: 'a', player_name: 'Joueur a' },
    ]);
  });

  it('numérote les équipes de façon contiguë', () => {
    const six = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => player(id));
    const numbers = [...new Set(buildTeamAssignments('l', six).map((a) => a.team_number))].sort();
    expect(numbers).toEqual([1, 2, 3]);
  });

  it('n’altère pas la liste de joueurs reçue', () => {
    const input = [...fourPlayers];
    buildTeamAssignments('lobby-1', input);
    expect(input).toEqual(fourPlayers);
  });
});

// ── 4. Mélange uniforme ────────────────────────────────────────────────────

describe('2v2 — mélange des joueurs', () => {
  it('conserve tous les joueurs', () => {
    const shuffled = shufflePlayers(fourPlayers, sequence([0.1, 0.9, 0.5]));
    expect(new Set(shuffled.map((p) => p.id))).toEqual(new Set(['a', 'b', 'c', 'd']));
  });

  it('conserve le nombre de joueurs', () => {
    expect(shufflePlayers(fourPlayers, sequence([0.3]))).toHaveLength(4);
  });

  it('n’altère pas la liste d’origine', () => {
    const input = [...fourPlayers];
    shufflePlayers(input, sequence([0.7, 0.2]));
    expect(input).toEqual(fourPlayers);
  });

  it('renvoie une nouvelle référence', () => {
    expect(shufflePlayers(fourPlayers)).not.toBe(fourPlayers);
  });

  it('laisse une liste vide inchangée', () => {
    expect(shufflePlayers([])).toEqual([]);
  });

  it('laisse une liste d’un élément inchangée', () => {
    expect(shufflePlayers([player('a')])).toEqual([player('a')]);
  });

  it('est déterministe pour un générateur donné', () => {
    const first = shufflePlayers(fourPlayers, sequence([0.1, 0.4, 0.8]));
    const second = shufflePlayers(fourPlayers, sequence([0.1, 0.4, 0.8]));
    expect(first).toEqual(second);
  });

  it('garde l’ordre quand l’aléa désigne toujours la position courante', () => {
    // random proche de 1 -> swapWith = index, donc aucun échange réel.
    expect(shufflePlayers(fourPlayers, () => 0.999_999_999).map((p) => p.id))
      .toEqual(['a', 'b', 'c', 'd']);
  });

  it('permute déterministement quand l’aléa vaut zéro', () => {
    // Fisher-Yates avec random=0 fait remonter chaque élément en tête.
    expect(shufflePlayers(fourPlayers, () => 0).map((p) => p.id)).toEqual(['b', 'c', 'd', 'a']);
  });

  it('ne produit jamais de doublon', () => {
    for (let seed = 0; seed < 12; seed += 1) {
      const shuffled = shufflePlayers(fourPlayers, sequence([seed / 12, 0.5, 0.25]));
      expect(new Set(shuffled.map((p) => p.id)).size).toBe(4);
    }
  });

  it('ne perd aucun joueur sur un grand effectif', () => {
    const twenty = Array.from({ length: 20 }, (_, i) => player(String(i)));
    const shuffled = shufflePlayers(twenty, sequence([0.13, 0.77, 0.31, 0.95]));
    expect(new Set(shuffled.map((p) => p.id)).size).toBe(20);
  });

  it('supporte un aléa hors bornes sans sortir du tableau', () => {
    const shuffled = shufflePlayers(fourPlayers, () => 5);
    expect(shuffled.filter(Boolean)).toHaveLength(4);
  });

  it('supporte un aléa négatif sans sortir du tableau', () => {
    const shuffled = shufflePlayers(fourPlayers, () => -2);
    expect(shuffled.filter(Boolean)).toHaveLength(4);
  });

  it('produit au moins deux permutations différentes sur des graines variées', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 25; seed += 1) {
      const shuffled = shufflePlayers(fourPlayers, sequence([seed / 25, (seed * 7) % 25 / 25, 0.5]));
      seen.add(shuffled.map((p) => p.id).join(''));
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('atteint plusieurs appariements distincts (pas de paire figée)', () => {
    const pairings = new Set<string>();
    for (let seed = 0; seed < 30; seed += 1) {
      const shuffled = shufflePlayers(fourPlayers, sequence([seed / 30, 0.9 - seed / 40, 0.2]));
      const assignments = buildTeamAssignments('l', shuffled);
      const team1 = assignments.filter((a) => a.team_number === 1).map((a) => a.player_id).sort();
      pairings.add(team1.join('-'));
    }
    expect(pairings.size).toBeGreaterThan(1);
  });
});

// ── 5. Synchro : regroupement des lignes SQL ───────────────────────────────

describe('2v2 — regroupement des lignes reçues du serveur', () => {
  it('regroupe deux équipes de deux', () => {
    const teams = groupTeamRows([row(1, 'a'), row(1, 'b'), row(2, 'c'), row(2, 'd')]);
    expect(teams).toHaveLength(2);
    expect(teams[0].players.map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('trie les équipes par numéro croissant', () => {
    const teams = groupTeamRows([row(3, 'e'), row(1, 'a'), row(2, 'c')]);
    expect(teams.map((t) => t.teamNumber)).toEqual([1, 2, 3]);
  });

  it('trie même quand le serveur renvoie l’ordre inverse', () => {
    const teams = groupTeamRows([row(2, 'c'), row(2, 'd'), row(1, 'a'), row(1, 'b')]);
    expect(teams.map((t) => t.teamNumber)).toEqual([1, 2]);
  });

  it('donne les mêmes équipes à deux joueurs malgré un ordre SQL différent', () => {
    const joueurA = groupTeamRows([row(1, 'a'), row(2, 'c'), row(1, 'b'), row(2, 'd')]);
    const joueurB = groupTeamRows([row(2, 'd'), row(1, 'b'), row(2, 'c'), row(1, 'a')]);
    expect(joueurA).toEqual(joueurB);
  });

  it('renvoie un tableau vide sans ligne', () => {
    expect(groupTeamRows([])).toEqual([]);
  });

  it('conserve les noms de joueurs', () => {
    const teams = groupTeamRows([row(1, 'a', 'Alice'), row(1, 'b', 'Bob')]);
    expect(teams[0].players.map((p) => p.name)).toEqual(['Alice', 'Bob']);
  });

  it('ignore une ligne rejouée après reconnexion realtime', () => {
    const teams = groupTeamRows([row(1, 'a'), row(1, 'a'), row(1, 'b')]);
    expect(teams[0].players.map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('déduplique sur plusieurs équipes à la fois', () => {
    const teams = groupTeamRows([row(1, 'a'), row(2, 'c'), row(1, 'a'), row(2, 'c')]);
    expect(teams[0].players).toHaveLength(1);
    expect(teams[1].players).toHaveLength(1);
  });

  it('ignore une ligne au numéro d’équipe non entier', () => {
    const teams = groupTeamRows([row(1, 'a'), { ...row(2, 'c'), team_number: 1.5 }]);
    expect(teams).toHaveLength(1);
  });

  it('accepte une équipe incomplète en attente du second joueur', () => {
    const teams = groupTeamRows([row(1, 'a')]);
    expect(teams[0].players).toHaveLength(1);
  });

  it('gère un effectif de dix joueurs sur cinq équipes', () => {
    const rows = Array.from({ length: 10 }, (_, i) => row(Math.floor(i / 2) + 1, String(i)));
    expect(groupTeamRows(rows)).toHaveLength(5);
  });

  it('supporte des numéros d’équipe non contigus', () => {
    const teams = groupTeamRows([row(1, 'a'), row(5, 'b'), row(9, 'c')]);
    expect(teams.map((t) => t.teamNumber)).toEqual([1, 5, 9]);
  });

  it('n’altère pas les lignes reçues', () => {
    const rows = [row(1, 'a'), row(1, 'b')];
    const copy = JSON.parse(JSON.stringify(rows));
    groupTeamRows(rows);
    expect(rows).toEqual(copy);
  });
});

// ── 6. Lecture des équipes en jeu ──────────────────────────────────────────

describe('2v2 — lecture des équipes pendant la partie', () => {
  it('trouve le coéquipier d’un joueur', () => {
    expect(findTeammate(twoTeams, 'a')?.id).toBe('b');
  });

  it('trouve le coéquipier dans l’autre sens', () => {
    expect(findTeammate(twoTeams, 'b')?.id).toBe('a');
  });

  it('trouve le coéquipier de la seconde équipe', () => {
    expect(findTeammate(twoTeams, 'c')?.id).toBe('d');
  });

  it('ne trouve aucun coéquipier pour un joueur inconnu', () => {
    expect(findTeammate(twoTeams, 'zzz')).toBeNull();
  });

  it('ne trouve aucun coéquipier dans une équipe incomplète', () => {
    expect(findTeammate([{ teamNumber: 1, players: [player('a')] }], 'a')).toBeNull();
  });

  it('ne trouve aucun coéquipier sans équipe', () => {
    expect(findTeammate([], 'a')).toBeNull();
  });

  it('renvoie le nom du coéquipier', () => {
    const teams: Team[] = [{ teamNumber: 1, players: [player('a', 'Alice'), player('b', 'Bob')] }];
    expect(findTeammate(teams, 'a')?.name).toBe('Bob');
  });

  it('trouve le numéro d’équipe d’un joueur', () => {
    expect(findPlayerTeam(twoTeams, 'a')).toBe(1);
  });

  it('trouve le numéro d’équipe du second groupe', () => {
    expect(findPlayerTeam(twoTeams, 'd')).toBe(2);
  });

  it('ne trouve aucun numéro pour un joueur absent', () => {
    expect(findPlayerTeam(twoTeams, 'zzz')).toBeNull();
  });

  it('ne trouve aucun numéro sans équipe', () => {
    expect(findPlayerTeam([], 'a')).toBeNull();
  });

  it('reconnaît deux coéquipiers', () => {
    expect(areTeammates(twoTeams, 'a', 'b')).toBe(true);
  });

  it('reconnaît deux adversaires', () => {
    expect(areTeammates(twoTeams, 'a', 'c')).toBe(false);
  });

  it('ne considère pas un joueur comme son propre coéquipier', () => {
    expect(areTeammates(twoTeams, 'a', 'a')).toBe(false);
  });

  it('refuse la coéquipiérité avec un joueur inconnu', () => {
    expect(areTeammates(twoTeams, 'a', 'zzz')).toBe(false);
  });

  it('refuse la coéquipiérité quand les deux sont inconnus', () => {
    expect(areTeammates(twoTeams, 'x', 'y')).toBe(false);
  });

  it('liste l’équipe adverse', () => {
    expect(findOpposingTeams(twoTeams, 'a').map((t) => t.teamNumber)).toEqual([2]);
  });

  it('liste toutes les équipes adverses à trois équipes', () => {
    const three: Team[] = [
      ...twoTeams,
      { teamNumber: 3, players: [player('e'), player('f')] },
    ];
    expect(findOpposingTeams(three, 'a').map((t) => t.teamNumber)).toEqual([2, 3]);
  });

  it('ne liste aucune adverse pour un joueur sans équipe', () => {
    expect(findOpposingTeams(twoTeams, 'zzz')).toEqual([]);
  });

  it('n’inclut jamais sa propre équipe dans les adverses', () => {
    for (const id of ['a', 'b', 'c', 'd']) {
      const own = findPlayerTeam(twoTeams, id);
      expect(findOpposingTeams(twoTeams, id).some((t) => t.teamNumber === own)).toBe(false);
    }
  });
});

// ── 7. Passage à la manche suivante : équipes prêtes ───────────────────────

describe('2v2 — équipes complètes avant de lancer la manche', () => {
  it('accepte deux équipes complètes', () => {
    expect(areTeamsComplete(twoTeams)).toBe(true);
  });

  it('refuse une équipe incomplète', () => {
    expect(
      areTeamsComplete([twoTeams[0], { teamNumber: 2, players: [player('c')] }]),
    ).toBe(false);
  });

  it('refuse une absence totale d’équipe', () => {
    expect(areTeamsComplete([])).toBe(false);
  });

  it('refuse une équipe surchargée', () => {
    expect(
      areTeamsComplete([{ teamNumber: 1, players: [player('a'), player('b'), player('c')] }]),
    ).toBe(false);
  });

  it('refuse une équipe vide', () => {
    expect(areTeamsComplete([{ teamNumber: 1, players: [] }])).toBe(false);
  });

  it('accepte trois équipes complètes', () => {
    const three: Team[] = [
      ...twoTeams,
      { teamNumber: 3, players: [player('e'), player('f')] },
    ];
    expect(areTeamsComplete(three)).toBe(true);
  });

  it('refuse dès qu’une seule équipe sur trois est incomplète', () => {
    const three: Team[] = [
      ...twoTeams,
      { teamNumber: 3, players: [player('e')] },
    ];
    expect(areTeamsComplete(three)).toBe(false);
  });

  it('valide le cycle complet : effectif, mélange, appariement, complétude', () => {
    expect(validateTeamFormation(fourPlayers.length).ok).toBe(true);
    const shuffled = shufflePlayers(fourPlayers, sequence([0.4, 0.6, 0.2]));
    const assignments = buildTeamAssignments('lobby-1', shuffled);
    const teams = groupTeamRows(
      assignments.map((a) => row(a.team_number, a.player_id, a.player_name)),
    );
    expect(areTeamsComplete(teams)).toBe(true);
    expect(getStartStatus({ mode: '2v2', connectedCount: 4, teamsCount: teams.length }).canStart)
      .toBe(true);
  });

  it('garde chaque joueur avec un coéquipier après un cycle complet', () => {
    const shuffled = shufflePlayers(fourPlayers, sequence([0.15, 0.85, 0.35]));
    const teams = groupTeamRows(
      buildTeamAssignments('lobby-1', shuffled).map((a) =>
        row(a.team_number, a.player_id, a.player_name),
      ),
    );
    for (const id of ['a', 'b', 'c', 'd']) {
      expect(findTeammate(teams, id)).not.toBeNull();
    }
  });

  it('ne place jamais un joueur dans deux équipes', () => {
    const shuffled = shufflePlayers(fourPlayers, sequence([0.55, 0.05, 0.75]));
    const teams = groupTeamRows(
      buildTeamAssignments('lobby-1', shuffled).map((a) =>
        row(a.team_number, a.player_id, a.player_name),
      ),
    );
    const seen = new Set<string>();
    for (const team of teams) {
      for (const p of team.players) {
        expect(seen.has(p.id)).toBe(false);
        seen.add(p.id);
      }
    }
    expect(seen.size).toBe(4);
  });

  it('reste cohérent après une reconnexion qui rejoue toutes les lignes', () => {
    const assignments = buildTeamAssignments('lobby-1', fourPlayers);
    const rows = assignments.map((a) => row(a.team_number, a.player_id, a.player_name));
    const rejoue = groupTeamRows([...rows, ...rows]);
    expect(areTeamsComplete(rejoue)).toBe(true);
    expect(rejoue).toEqual(groupTeamRows(rows));
  });
});
