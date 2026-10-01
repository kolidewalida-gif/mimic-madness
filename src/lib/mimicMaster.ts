import type { VotableImitation } from './imitationVoting';

export interface MimicMasterChoice {
  voterPlayerId: string;
  targetPlayerIds: string[];
  targetTeamNumber: number | null;
  voterTeamNumber: number | null;
}

export type MasterAvailability = 'available' | 'own' | 'no-audio' | 'not-ready' | 'selected' | 'used';

export function masterAvailability(
  target: VotableImitation | null,
  self: string,
  ready: boolean,
  choice: MimicMasterChoice | null,
): MasterAvailability {
  if (choice) {
    return target?.playerIds.length && target.playerIds.every(id => choice.targetPlayerIds.includes(id))
      && choice.targetPlayerIds.length === target.playerIds.length ? 'selected' : 'used';
  }
  if (!ready || !target?.playerIds.length) return 'not-ready';
  if (target.playerIds.includes(self)) return 'own';
  if (!target.clipIds.some(Boolean)) return 'no-audio';
  // Giving a regular vote never consumes or disables the one favorite.
  return 'available';
}

export interface MasterScore {
  key: string;
  baseScore: number;
  masterCount: number;
  predictionBonus: number;
  score: number;
}

/** Apply bonuses to the unchanged vote scale, without recursive bonus chains.
 * A duo is one scoring unit: received +1 and predictor bonus are never doubled.
 */
export function scoreMimicMasters(
  units: { key: string; baseScore: number }[],
  choices: MimicMasterChoice[],
  teamMode: boolean,
): Map<string, MasterScore> {
  const scores = new Map(units.map(unit => [unit.key, {
    ...unit, masterCount: 0, predictionBonus: 0, score: unit.baseScore,
  }]));
  const seen = new Set<string>();
  for (const choice of choices) {
    if (seen.has(choice.voterPlayerId)) continue;
    seen.add(choice.voterPlayerId);
    const targetKey = teamMode ? String(choice.targetTeamNumber) : choice.targetPlayerIds[0];
    const voterKey = teamMode ? String(choice.voterTeamNumber) : choice.voterPlayerId;
    const target = scores.get(targetKey);
    const voter = scores.get(voterKey);
    if (!target || !voter || target.key === voter.key) continue;
    target.masterCount += 1;
    voter.predictionBonus += target.baseScore / 2;
  }
  for (const score of scores.values()) {
    score.score = score.baseScore + score.masterCount + score.predictionBonus;
  }
  return scores;
}

export function formatMasterPoints(points: number): string {
  return `${points > 0 ? '+' : ''}${points.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}`;
}
