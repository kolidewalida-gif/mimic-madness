/**
 * Formation des équipes (mode 2v2).
 *
 * Extrait de `useGameTeams` pour que les règles d'équipe soient vérifiables
 * sans réseau : regroupement des lignes SQL, validation de l'effectif,
 * mélange équitable et appariement deux par deux.
 */

export interface TeamPlayer {
  id: string;
  name: string;
}

export interface Team {
  teamNumber: number;
  players: TeamPlayer[];
}

/** Ligne telle que stockée dans `game_teams`. */
export interface TeamRow {
  team_number: number;
  player_id: string;
  player_name: string;
}

export interface TeamAssignment {
  lobby_id: string;
  team_number: number;
  player_id: string;
  player_name: string;
}

/** Deux joueurs par équipe : c'est la définition du mode. */
export const TEAM_SIZE = 2;
export const MIN_2V2_PLAYERS = 4;

/**
 * Regrouper les lignes SQL en équipes ordonnées.
 *
 * L'ordre des lignes renvoyées par PostgreSQL n'est garanti que par le tri
 * demandé ; on retrie ici pour que l'affichage reste stable même si la requête
 * change, et pour que deux joueurs voient exactement les mêmes équipes.
 */
export const groupTeamRows = (rows: readonly TeamRow[]): Team[] => {
  const byTeam = new Map<number, TeamPlayer[]>();

  for (const row of rows) {
    if (!Number.isInteger(row.team_number)) continue;
    const players = byTeam.get(row.team_number) ?? [];
    // Une même ligne peut arriver deux fois après une reconnexion realtime.
    if (players.some((player) => player.id === row.player_id)) continue;
    players.push({ id: row.player_id, name: row.player_name });
    byTeam.set(row.team_number, players);
  }

  return [...byTeam.entries()]
    .map(([teamNumber, players]) => ({
      teamNumber,
      // Trié par identifiant : l'ordre d'arrivée des lignes n'est pas garanti,
      // donc sans ce tri deux joueurs pouvaient afficher la même équipe dans un
      // ordre différent.
      players: [...players].sort((a, b) => a.id.localeCompare(b.id)),
    }))
    .sort((a, b) => a.teamNumber - b.teamNumber);
};

export interface TeamFormationCheck {
  ok: boolean;
  reason?: string;
}

/** Le 2v2 exige au moins quatre joueurs, en nombre pair. */
export const validateTeamFormation = (playerCount: number): TeamFormationCheck => {
  if (!Number.isInteger(playerCount) || playerCount < MIN_2V2_PLAYERS) {
    return { ok: false, reason: 'Il faut au moins 4 joueurs pour le mode 2v2' };
  }
  if (playerCount % TEAM_SIZE !== 0) {
    return { ok: false, reason: 'Le nombre de joueurs doit être pair pour le mode 2v2' };
  }
  return { ok: true };
};

/**
 * Mélange de Fisher-Yates.
 *
 * `sort(() => Math.random() - 0.5)` n'est pas un mélange uniforme : le
 * comparateur est incohérent, donc certaines permutations sortent bien plus
 * souvent que d'autres et les mêmes joueurs se retrouvaient trop souvent
 * ensemble. Fisher-Yates est uniforme.
 */
export const shufflePlayers = <T>(items: readonly T[], random: () => number = Math.random): T[] => {
  const output = [...items];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(Math.max(0, Math.min(0.999_999_999, random())) * (index + 1));
    const temp = output[index];
    output[index] = output[swapWith];
    output[swapWith] = temp;
  }
  return output;
};

/** Apparier une liste déjà mélangée en équipes de deux, numérotées à partir de 1. */
export const buildTeamAssignments = (
  lobbyId: string,
  players: readonly TeamPlayer[],
): TeamAssignment[] => {
  const assignments: TeamAssignment[] = [];
  for (let index = 0; index < players.length; index += TEAM_SIZE) {
    const teamNumber = Math.floor(index / TEAM_SIZE) + 1;
    for (let offset = 0; offset < TEAM_SIZE; offset += 1) {
      const player = players[index + offset];
      if (!player) continue;
      assignments.push({
        lobby_id: lobbyId,
        team_number: teamNumber,
        player_id: player.id,
        player_name: player.name,
      });
    }
  }
  return assignments;
};

/** Le coéquipier d'un joueur, ou null s'il est seul ou absent. */
export const findTeammate = (
  teams: readonly Team[],
  playerId: string,
): TeamPlayer | null => {
  for (const team of teams) {
    if (!team.players.some((player) => player.id === playerId)) continue;
    return team.players.find((player) => player.id !== playerId) ?? null;
  }
  return null;
};

/** Le numéro d'équipe d'un joueur, ou null s'il n'est dans aucune. */
export const findPlayerTeam = (
  teams: readonly Team[],
  playerId: string,
): number | null => {
  for (const team of teams) {
    if (team.players.some((player) => player.id === playerId)) return team.teamNumber;
  }
  return null;
};

/** Vrai quand chaque équipe est complète : la partie peut démarrer. */
export const areTeamsComplete = (teams: readonly Team[]): boolean =>
  teams.length > 0 && teams.every((team) => team.players.length === TEAM_SIZE);

/** Deux joueurs sont-ils dans la même équipe ? */
export const areTeammates = (
  teams: readonly Team[],
  firstPlayerId: string,
  secondPlayerId: string,
): boolean => {
  if (firstPlayerId === secondPlayerId) return false;
  const team = findPlayerTeam(teams, firstPlayerId);
  return team !== null && team === findPlayerTeam(teams, secondPlayerId);
};

/** Équipes adverses d'un joueur, dans l'ordre. */
export const findOpposingTeams = (
  teams: readonly Team[],
  playerId: string,
): Team[] => {
  const own = findPlayerTeam(teams, playerId);
  if (own === null) return [];
  return teams.filter((team) => team.teamNumber !== own);
};
