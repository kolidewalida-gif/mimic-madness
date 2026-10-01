import { supabase } from '@/integrations/supabase/client';
import { isSchemaGapError } from './imitationSyncClient';
import type { MimicMasterChoice } from './mimicMaster';

async function withDeadline<T>(request: PromiseLike<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([Promise.resolve(request), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Mimic Master request timed out')), 10000);
    })]);
  } finally {
    clearTimeout(timer!);
  }
}

export async function readMimicMasters(lobbyId: string, roundNumber: number, playerId: string) {
  const { data, error } = await withDeadline(supabase.rpc('read_mimic_masters', {
    p_lobby_id: lobbyId, p_round_number: roundNumber, p_player_id: playerId,
  }));
  if (error) {
    if (isSchemaGapError(error)) return { available: false, choices: [] as MimicMasterChoice[] };
    throw error;
  }
  return { available: true, choices: (data ?? []).map(row => ({
    voterPlayerId: row.voter_player_id,
    targetPlayerIds: row.target_player_ids,
    targetTeamNumber: row.target_team_number,
    voterTeamNumber: row.voter_team_number,
  })) };
}

export async function castMimicMaster(input: {
  lobbyId: string; roundNumber: number; playerId: string; targetIds: string[];
  sessionId: string; expectedIndex: number;
}): Promise<boolean> {
  const { data, error } = await withDeadline(supabase.rpc('cast_mimic_master', {
    p_lobby_id: input.lobbyId, p_round_number: input.roundNumber,
    p_voter_player_id: input.playerId, p_target_player_ids: input.targetIds,
    p_session_id: input.sessionId, p_expected_index: input.expectedIndex,
  }));
  // No local-storage or direct-table fallback: only SQL can enforce one award.
  if (error) throw error;
  return data === true;
}
