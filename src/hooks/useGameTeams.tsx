import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  buildTeamAssignments,
  findPlayerTeam,
  findTeammate,
  groupTeamRows,
  shufflePlayers,
  validateTeamFormation,
  type Team,
  type TeamRow,
} from '@/lib/teamsLogic';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

export const useGameTeams = (lobbyId: string | null) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch existing teams
  const fetchTeams = useCallback(async () => {
    if (!lobbyId) return;

    try {
      const { data, error } = await supabase
        .from('game_teams')
        .select('*')
        .eq('lobby_id', lobbyId)
        .order('team_number', { ascending: true });

      if (error) throw error;

      if (data) {
        setTeams(groupTeamRows(data as TeamRow[]));
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  }, [lobbyId]);

  // Subscribe to team changes
  useEffect(() => {
    if (!lobbyId) {
      setTeams([]);
      return;
    }

    fetchTeams();

    const channel = supabase
      .channel(`teams:${lobbyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_teams',
          filter: `lobby_id=eq.${lobbyId}`
        },
        () => {
          fetchTeams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId, fetchTeams]);

  // Randomly assign teams (2 players per team)
  const assignRandomTeams = useCallback(async (players: Player[]) => {
    const check = validateTeamFormation(lobbyId ? players.length : 0);
    if (!check.ok) {
      toast({
        title: "Erreur",
        description: check.reason,
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);
    try {
      // Delete existing teams
      await supabase
        .from('game_teams')
        .delete()
        .eq('lobby_id', lobbyId);

      // Fisher-Yates: un mélange uniforme, contrairement à un comparateur
      // aléatoire qui favorisait certaines paires.
      const shuffled = shufflePlayers(players);
      const teamAssignments = buildTeamAssignments(lobbyId as string, shuffled);

      const { error } = await supabase
        .from('game_teams')
        .insert(teamAssignments);

      if (error) throw error;

      toast({
        title: "Équipes créées !",
        description: `${teamAssignments.length / 2} équipes ont été formées`,
      });

      return true;
    } catch (error: any) {
      console.error('Error assigning teams:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer les équipes",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [lobbyId, toast]);

  // Get teammate for a player
  const getTeammate = useCallback(
    (playerId: string) => findTeammate(teams, playerId),
    [teams],
  );

  // Get team number for a player
  const getPlayerTeam = useCallback(
    (playerId: string) => findPlayerTeam(teams, playerId),
    [teams],
  );

  // Clear teams
  const clearTeams = useCallback(async () => {
    if (!lobbyId) return;

    try {
      await supabase
        .from('game_teams')
        .delete()
        .eq('lobby_id', lobbyId);
      setTeams([]);
    } catch (error) {
      console.error('Error clearing teams:', error);
    }
  }, [lobbyId]);

  return {
    teams,
    isLoading,
    assignRandomTeams,
    getTeammate,
    getPlayerTeam,
    clearTeams,
    fetchTeams,
  };
};
