import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Team {
  teamNumber: number;
  players: {
    id: string;
    name: string;
  }[];
}

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
        // Group by team number
        const teamMap = new Map<number, { id: string; name: string }[]>();
        data.forEach((row) => {
          const existing = teamMap.get(row.team_number) || [];
          existing.push({ id: row.player_id, name: row.player_name });
          teamMap.set(row.team_number, existing);
        });

        const teamsArray: Team[] = [];
        teamMap.forEach((players, teamNumber) => {
          teamsArray.push({ teamNumber, players });
        });
        teamsArray.sort((a, b) => a.teamNumber - b.teamNumber);
        setTeams(teamsArray);
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
    if (!lobbyId || players.length < 4) {
      toast({
        title: "Erreur",
        description: "Il faut au moins 4 joueurs pour le mode 2v2",
        variant: "destructive",
      });
      return false;
    }

    if (players.length % 2 !== 0) {
      toast({
        title: "Erreur",
        description: "Le nombre de joueurs doit être pair pour le mode 2v2",
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

      // Shuffle players
      const shuffled = [...players].sort(() => Math.random() - 0.5);

      // Create teams of 2
      const teamAssignments = [];
      for (let i = 0; i < shuffled.length; i += 2) {
        const teamNumber = Math.floor(i / 2) + 1;
        teamAssignments.push({
          lobby_id: lobbyId,
          team_number: teamNumber,
          player_id: shuffled[i].id,
          player_name: shuffled[i].name,
        });
        if (shuffled[i + 1]) {
          teamAssignments.push({
            lobby_id: lobbyId,
            team_number: teamNumber,
            player_id: shuffled[i + 1].id,
            player_name: shuffled[i + 1].name,
          });
        }
      }

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
  const getTeammate = useCallback((playerId: string): { id: string; name: string } | null => {
    for (const team of teams) {
      const playerInTeam = team.players.find(p => p.id === playerId);
      if (playerInTeam) {
        const teammate = team.players.find(p => p.id !== playerId);
        return teammate || null;
      }
    }
    return null;
  }, [teams]);

  // Get team number for a player
  const getPlayerTeam = useCallback((playerId: string): number | null => {
    for (const team of teams) {
      if (team.players.some(p => p.id === playerId)) {
        return team.teamNumber;
      }
    }
    return null;
  }, [teams]);

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
