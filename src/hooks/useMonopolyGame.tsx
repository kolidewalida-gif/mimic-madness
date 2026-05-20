import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  BOARD_SPACES,
  CHANCE_CARDS,
  COMMUNITY_CARDS,
  calculateRent,
  getPropertiesInGroup,
  type GameCard,
  type TokenType,
} from '@/lib/monopolyBoard';
import { useToast } from '@/hooks/use-toast';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface MonopolyPlayer {
  id: string;
  game_id: string;
  player_id: string;
  player_name: string;
  token_type: string;
  position: number;
  money: number;
  is_bankrupt: boolean;
  in_jail: boolean;
  jail_turns: number;
  has_get_out_of_jail_card: number;
  player_order: number;
}

interface MonopolyProperty {
  id: string;
  game_id: string;
  property_index: number;
  owner_id: string | null;
  houses: number;
  is_mortgaged: boolean;
}

interface MonopolyGame {
  id: string;
  lobby_id: string;
  current_player_index: number;
  player_order: string[];
  phase: string;
  free_parking_pot: number;
  is_finished: boolean;
  winner_id: string | null;
  winner_name: string | null;
  last_dice_1: number | null;
  last_dice_2: number | null;
  doubles_count: number;
  trade_from_player: string | null;
  trade_to_player: string | null;
  trade_offer: any;
}

const isBotId = (id: string) => id.startsWith('bot-');

export function useMonopolyGame(
  lobbyId: string,
  currentPlayer: Player,
  players: Player[],
) {
  const [game, setGame] = useState<MonopolyGame | null>(null);
  const [mPlayers, setMPlayers] = useState<MonopolyPlayer[]>([]);
  const [properties, setProperties] = useState<MonopolyProperty[]>([]);
  const [currentCard, setCurrentCard] = useState<GameCard | null>(null);
  const [message, setMessage] = useState<string>('');
  const [animatingTo, setAnimatingTo] = useState<number | null>(null);
  const { toast } = useToast();
  const gameIdRef = useRef<string | null>(null);
  const initialisedRef = useRef(false);

  const isMyTurn = game
    ? game.player_order[game.current_player_index] === currentPlayer.id
    : false;
  const currentTurnPlayer = game
    ? mPlayers.find(
        (p) => p.player_id === game.player_order[game.current_player_index],
      )
    : null;
  const myPlayer = mPlayers.find((p) => p.player_id === currentPlayer.id);

  /* ============================================================
     INIT — host creates game, both fetch initial rows
  ============================================================ */
  useEffect(() => {
    if (initialisedRef.current) return;
    initialisedRef.current = true;

    const init = async () => {
      // Try to find an existing game for this lobby
      const { data: existing } = await supabase
        .from('monopoly_games')
        .select('*')
        .eq('lobby_id', lobbyId)
        .maybeSingle();

      if (existing) {
        setGame(existing as MonopolyGame);
        gameIdRef.current = existing.id;

        const { data: pls } = await supabase
          .from('monopoly_players')
          .select('*')
          .eq('game_id', existing.id);
        if (pls) setMPlayers(pls as MonopolyPlayer[]);

        const { data: props } = await supabase
          .from('monopoly_properties')
          .select('*')
          .eq('game_id', existing.id);
        if (props) setProperties(props as MonopolyProperty[]);
        return;
      }

      // Only host creates the game
      if (!currentPlayer.isHost) return;

      const tokens: TokenType[] = [
        'car',
        'hat',
        'shoe',
        'dog',
        'ship',
        'thimble',
        'iron',
        'cannon',
      ];
      const playerOrder = players.map((p) => p.id).sort(() => Math.random() - 0.5);

      const { data: newGame, error } = await supabase
        .from('monopoly_games')
        .insert({
          lobby_id: lobbyId,
          player_order: playerOrder,
          current_player_index: 0,
          phase: 'rolling',
        })
        .select()
        .single();

      if (error || !newGame) {
        console.error('Failed to create monopoly game:', error);
        initialisedRef.current = false; // allow retry
        return;
      }

      gameIdRef.current = newGame.id;

      // Player rows
      const playerInserts = playerOrder.map((pid, i) => ({
        game_id: newGame.id,
        player_id: pid,
        player_name: players.find((p) => p.id === pid)?.name || 'Joueur',
        token_type: tokens[i % tokens.length],
        position: 0,
        money: 1500,
        player_order: i,
        is_bankrupt: false,
        in_jail: false,
        jail_turns: 0,
        has_get_out_of_jail_card: 0,
      }));
      const { data: insertedPlayers } = await supabase
        .from('monopoly_players')
        .insert(playerInserts)
        .select();

      // Property rows
      const propInserts = BOARD_SPACES.filter(
        (s) =>
          s.type === 'property' ||
          s.type === 'railroad' ||
          s.type === 'utility',
      ).map((s) => ({
        game_id: newGame.id,
        property_index: s.index,
        owner_id: null,
        houses: 0,
        is_mortgaged: false,
      }));
      const { data: insertedProps } = await supabase
        .from('monopoly_properties')
        .insert(propInserts)
        .select();

      // Set local state immediately so the UI renders without waiting for realtime
      setGame(newGame as MonopolyGame);
      if (insertedPlayers) setMPlayers(insertedPlayers as MonopolyPlayer[]);
      if (insertedProps) setProperties(insertedProps as MonopolyProperty[]);
    };

    init();
  }, [lobbyId, currentPlayer.isHost, players]);

  /* ============================================================
     REALTIME — game row
  ============================================================ */
  useEffect(() => {
    if (!lobbyId) return;

    const channel = supabase
      .channel(`monopoly:${lobbyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'monopoly_games',
          filter: `lobby_id=eq.${lobbyId}`,
        },
        async (payload: any) => {
          if (payload.new) {
            setGame(payload.new as MonopolyGame);
            const newId = payload.new.id;
            if (gameIdRef.current !== newId) {
              gameIdRef.current = newId;
              // Refresh players/properties
              const { data: pls } = await supabase
                .from('monopoly_players')
                .select('*')
                .eq('game_id', newId);
              if (pls) setMPlayers(pls as MonopolyPlayer[]);
              const { data: props } = await supabase
                .from('monopoly_properties')
                .select('*')
                .eq('game_id', newId);
              if (props) setProperties(props as MonopolyProperty[]);
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId]);

  /* ============================================================
     REALTIME — players + properties (re-subscribes when game.id changes)
  ============================================================ */
  useEffect(() => {
    const gid = game?.id;
    if (!gid) return;

    const ch1 = supabase
      .channel(`monopoly-players:${gid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'monopoly_players',
          filter: `game_id=eq.${gid}`,
        },
        async () => {
          const { data } = await supabase
            .from('monopoly_players')
            .select('*')
            .eq('game_id', gid);
          if (data) setMPlayers(data as MonopolyPlayer[]);
        },
      )
      .subscribe();

    const ch2 = supabase
      .channel(`monopoly-props:${gid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'monopoly_properties',
          filter: `game_id=eq.${gid}`,
        },
        async () => {
          const { data } = await supabase
            .from('monopoly_properties')
            .select('*')
            .eq('game_id', gid);
          if (data) setProperties(data as MonopolyProperty[]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [game?.id]);

  /* ============================================================
     CORE GAME LOGIC — generic helpers (act for a specific playerId)
  ============================================================ */

  const rollDiceFor = useCallback(
    async (actorId: string) => {
      if (!game) return;
      const player = mPlayers.find((p) => p.player_id === actorId);
      if (!player) return;

      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const isDoubles = d1 === d2;
      const total = d1 + d2;

      // 3 doubles -> jail
      if (isDoubles && game.doubles_count >= 2) {
        await supabase
          .from('monopoly_players')
          .update({ in_jail: true, position: 10 })
          .eq('game_id', game.id)
          .eq('player_id', actorId);
        await supabase
          .from('monopoly_games')
          .update({
            phase: 'rolled',
            last_dice_1: d1,
            last_dice_2: d2,
            doubles_count: 0,
          })
          .eq('id', game.id);
        setMessage('3 doubles ! En prison !');
        setTimeout(() => endTurn(), 1500);
        return;
      }

      // Jail logic
      if (player.in_jail) {
        if (isDoubles) {
          await supabase
            .from('monopoly_players')
            .update({ in_jail: false, jail_turns: 0 })
            .eq('game_id', game.id)
            .eq('player_id', actorId);
          setMessage('Double ! Sortie de prison !');
        } else if (player.jail_turns >= 2) {
          await supabase
            .from('monopoly_players')
            .update({
              in_jail: false,
              jail_turns: 0,
              money: player.money - 50,
            })
            .eq('game_id', game.id)
            .eq('player_id', actorId);
          setMessage('3 tours en prison. -50$ et libéré.');
        } else {
          await supabase
            .from('monopoly_players')
            .update({ jail_turns: player.jail_turns + 1 })
            .eq('game_id', game.id)
            .eq('player_id', actorId);
          await supabase
            .from('monopoly_games')
            .update({ phase: 'rolled', last_dice_1: d1, last_dice_2: d2 })
            .eq('id', game.id);
          setMessage('Pas de double. Toujours en prison.');
          setTimeout(() => endTurn(), 1500);
          return;
        }
      }

      const newPos = (player.position + total) % 40;
      const passedGo = newPos < player.position;
      const newMoney = player.money + (passedGo ? 200 : 0);

      await supabase
        .from('monopoly_players')
        .update({ position: newPos, money: newMoney })
        .eq('game_id', game.id)
        .eq('player_id', actorId);

      await supabase
        .from('monopoly_games')
        .update({
          last_dice_1: d1,
          last_dice_2: d2,
          doubles_count: isDoubles ? game.doubles_count + 1 : 0,
          phase: 'rolled',
        })
        .eq('id', game.id);

      setAnimatingTo(newPos);
      if (passedGo) setMessage(`Passage par le Départ ! +200$`);

      setTimeout(() => handleLandingFor(actorId, newPos, newMoney, total), 1400);
    },
    [game, mPlayers, properties],
  );

  const handleLandingFor = useCallback(
    async (
      actorId: string,
      position: number,
      money: number,
      diceTotal: number,
    ) => {
      if (!game) return;
      const space = BOARD_SPACES[position];
      setAnimatingTo(null);

      switch (space.type) {
        case 'go':
          setMessage('Sur le Départ !');
          await checkEndTurn();
          break;

        case 'property':
        case 'railroad':
        case 'utility': {
          const prop = properties.find((p) => p.property_index === position);
          if (!prop) {
            await checkEndTurn();
            break;
          }

          if (!prop.owner_id) {
            await supabase
              .from('monopoly_games')
              .update({ phase: 'buying' })
              .eq('id', game.id);
            setMessage(`${space.nameFr} disponible pour ${space.price}$ !`);
          } else if (prop.owner_id !== actorId && !prop.is_mortgaged) {
            const ownerProps = properties.filter(
              (p) => p.owner_id === prop.owner_id,
            );
            const rent = calculateRent(space, prop.houses, ownerProps, diceTotal);
            const owner = mPlayers.find((p) => p.player_id === prop.owner_id);

            setMessage(
              `Loyer ${rent}$ à ${owner?.player_name || 'propriétaire'}`,
            );

            await supabase
              .from('monopoly_players')
              .update({ money: money - rent })
              .eq('game_id', game.id)
              .eq('player_id', actorId);
            if (owner) {
              await supabase
                .from('monopoly_players')
                .update({ money: owner.money + rent })
                .eq('game_id', game.id)
                .eq('player_id', owner.player_id);
            }

            if (money - rent < 0) {
              await supabase
                .from('monopoly_games')
                .update({ phase: 'bankrupt' })
                .eq('id', game.id);
            } else {
              await checkEndTurn();
            }
          } else {
            setMessage('Sur votre propriété.');
            await checkEndTurn();
          }
          break;
        }

        case 'tax': {
          const tax = space.taxAmount || 0;
          setMessage(`Taxe de ${tax}$ !`);
          await supabase
            .from('monopoly_players')
            .update({ money: money - tax })
            .eq('game_id', game.id)
            .eq('player_id', actorId);
          await supabase
            .from('monopoly_games')
            .update({ free_parking_pot: (game.free_parking_pot || 0) + tax })
            .eq('id', game.id);
          if (money - tax < 0) {
            await supabase
              .from('monopoly_games')
              .update({ phase: 'bankrupt' })
              .eq('id', game.id);
          } else {
            await checkEndTurn();
          }
          break;
        }

        case 'chance':
        case 'community': {
          const cards = space.type === 'chance' ? CHANCE_CARDS : COMMUNITY_CARDS;
          const card = cards[Math.floor(Math.random() * cards.length)];
          setCurrentCard(card);
          setMessage(card.textFr);
          await supabase
            .from('monopoly_games')
            .update({ phase: 'card' })
            .eq('id', game.id);
          break;
        }

        case 'go_to_jail':
          setMessage('Allez en Prison !');
          await supabase
            .from('monopoly_players')
            .update({ position: 10, in_jail: true })
            .eq('game_id', game.id)
            .eq('player_id', actorId);
          setTimeout(() => endTurn(), 1500);
          break;

        case 'jail':
          setMessage('Simple visite !');
          await checkEndTurn();
          break;

        case 'free_parking': {
          const pot = game.free_parking_pot || 0;
          if (pot > 0) {
            setMessage(`Parc Gratuit ! +${pot}$ !`);
            await supabase
              .from('monopoly_players')
              .update({ money: money + pot })
              .eq('game_id', game.id)
              .eq('player_id', actorId);
            await supabase
              .from('monopoly_games')
              .update({ free_parking_pot: 0 })
              .eq('id', game.id);
          } else {
            setMessage('Parc Gratuit !');
          }
          await checkEndTurn();
          break;
        }
      }
    },
    [game, properties, mPlayers],
  );

  const checkEndTurn = useCallback(async () => {
    if (!game) return;
    if (game.last_dice_1 === game.last_dice_2 && game.last_dice_1) {
      await supabase
        .from('monopoly_games')
        .update({ phase: 'rolling' })
        .eq('id', game.id);
      setMessage('Double ! Relancez !');
    } else {
      setTimeout(() => endTurn(), 1500);
    }
  }, [game]);

  const endTurn = useCallback(async () => {
    if (!game) return;

    let nextIdx = (game.current_player_index + 1) % game.player_order.length;
    let attempts = 0;
    while (attempts < game.player_order.length) {
      const nextPlayerId = game.player_order[nextIdx];
      const nextP = mPlayers.find((p) => p.player_id === nextPlayerId);
      if (nextP && !nextP.is_bankrupt) break;
      nextIdx = (nextIdx + 1) % game.player_order.length;
      attempts++;
    }

    const activePlayers = mPlayers.filter((p) => !p.is_bankrupt);
    if (activePlayers.length <= 1) {
      const winner = activePlayers[0];
      await supabase
        .from('monopoly_games')
        .update({
          is_finished: true,
          phase: 'finished',
          winner_id: winner?.player_id,
          winner_name: winner?.player_name,
        })
        .eq('id', game.id);
      return;
    }

    await supabase
      .from('monopoly_games')
      .update({
        current_player_index: nextIdx,
        phase: 'rolling',
        doubles_count: 0,
      })
      .eq('id', game.id);
  }, [game, mPlayers]);

  const buyPropertyFor = useCallback(
    async (actorId: string) => {
      if (!game) return;
      const player = mPlayers.find((p) => p.player_id === actorId);
      if (!player) return;
      const space = BOARD_SPACES[player.position];
      if (!space.price) return;

      if (player.money < space.price) {
        if (actorId === currentPlayer.id) {
          toast({ title: "Pas assez d'argent !", variant: 'destructive' });
        }
        return;
      }

      await supabase
        .from('monopoly_properties')
        .update({ owner_id: actorId })
        .eq('game_id', game.id)
        .eq('property_index', player.position);
      await supabase
        .from('monopoly_players')
        .update({ money: player.money - space.price })
        .eq('game_id', game.id)
        .eq('player_id', actorId);

      setMessage(`${space.nameFr} achetée !`);
      await checkEndTurn();
    },
    [game, mPlayers, currentPlayer.id, toast, checkEndTurn],
  );

  const skipBuy = useCallback(async () => {
    if (!game) return;
    setMessage('Propriété ignorée.');
    await checkEndTurn();
  }, [game, checkEndTurn]);

  const executeCardFor = useCallback(
    async (actorId: string, card: GameCard) => {
      if (!game) return;
      const player = mPlayers.find((p) => p.player_id === actorId);
      if (!player) return;

      switch (card.action) {
        case 'collect':
          await supabase
            .from('monopoly_players')
            .update({ money: player.money + (card.amount || 0) })
            .eq('game_id', game.id)
            .eq('player_id', actorId);
          break;
        case 'pay':
          await supabase
            .from('monopoly_players')
            .update({ money: player.money - (card.amount || 0) })
            .eq('game_id', game.id)
            .eq('player_id', actorId);
          break;
        case 'move_to': {
          const passGo = (card.position || 0) < player.position;
          await supabase
            .from('monopoly_players')
            .update({
              position: card.position || 0,
              money: player.money + (passGo ? 200 : 0),
            })
            .eq('game_id', game.id)
            .eq('player_id', actorId);
          break;
        }
        case 'move_back': {
          const newPos = (player.position - (card.amount || 0) + 40) % 40;
          await supabase
            .from('monopoly_players')
            .update({ position: newPos })
            .eq('game_id', game.id)
            .eq('player_id', actorId);
          break;
        }
        case 'jail':
          await supabase
            .from('monopoly_players')
            .update({ position: 10, in_jail: true })
            .eq('game_id', game.id)
            .eq('player_id', actorId);
          break;
        case 'get_out_of_jail':
          await supabase
            .from('monopoly_players')
            .update({
              has_get_out_of_jail_card: player.has_get_out_of_jail_card + 1,
            })
            .eq('game_id', game.id)
            .eq('player_id', actorId);
          break;
        case 'repairs': {
          const myProps = properties.filter((p) => p.owner_id === actorId);
          let cost = 0;
          myProps.forEach((p) => {
            if (p.houses === 5) cost += card.perHotel || 0;
            else cost += p.houses * (card.perHouse || 0);
          });
          await supabase
            .from('monopoly_players')
            .update({ money: player.money - cost })
            .eq('game_id', game.id)
            .eq('player_id', actorId);
          break;
        }
        case 'pay_each': {
          const others = mPlayers.filter(
            (p) => p.player_id !== actorId && !p.is_bankrupt,
          );
          const total = others.length * (card.amount || 0);
          await supabase
            .from('monopoly_players')
            .update({ money: player.money - total })
            .eq('game_id', game.id)
            .eq('player_id', actorId);
          for (const other of others) {
            await supabase
              .from('monopoly_players')
              .update({ money: other.money + (card.amount || 0) })
              .eq('game_id', game.id)
              .eq('player_id', other.player_id);
          }
          break;
        }
        case 'collect_each': {
          const others2 = mPlayers.filter(
            (p) => p.player_id !== actorId && !p.is_bankrupt,
          );
          const total2 = others2.length * (card.amount || 0);
          await supabase
            .from('monopoly_players')
            .update({ money: player.money + total2 })
            .eq('game_id', game.id)
            .eq('player_id', actorId);
          for (const other of others2) {
            await supabase
              .from('monopoly_players')
              .update({ money: other.money - (card.amount || 0) })
              .eq('game_id', game.id)
              .eq('player_id', other.player_id);
          }
          break;
        }
      }

      setCurrentCard(null);
      await checkEndTurn();
    },
    [game, mPlayers, properties, checkEndTurn],
  );

  /* ============================================================
     PUBLIC API for the local UI (currentPlayer)
  ============================================================ */
  const rollDice = useCallback(() => {
    if (!isMyTurn) return;
    rollDiceFor(currentPlayer.id);
  }, [isMyTurn, rollDiceFor, currentPlayer.id]);

  const buyProperty = useCallback(() => {
    if (!isMyTurn) return;
    buyPropertyFor(currentPlayer.id);
  }, [isMyTurn, buyPropertyFor, currentPlayer.id]);

  const executeCard = useCallback(() => {
    if (!isMyTurn || !currentCard) return;
    executeCardFor(currentPlayer.id, currentCard);
  }, [isMyTurn, executeCardFor, currentPlayer.id, currentCard]);

  const buyHouse = useCallback(
    async (propertyIndex: number) => {
      if (!game || !myPlayer) return;
      const space = BOARD_SPACES[propertyIndex];
      const prop = properties.find((p) => p.property_index === propertyIndex);
      if (!prop || prop.owner_id !== currentPlayer.id || !space.houseCost) return;
      if (prop.houses >= 5) return;
      if (myPlayer.money < space.houseCost) {
        toast({ title: "Pas assez d'argent !", variant: 'destructive' });
        return;
      }
      const groupProps = getPropertiesInGroup(space.group!);
      const ownsAll = groupProps.every((gp) =>
        properties.some(
          (op) => op.property_index === gp.index && op.owner_id === currentPlayer.id,
        ),
      );
      if (!ownsAll) {
        toast({
          title: 'Vous devez posséder tout le groupe !',
          variant: 'destructive',
        });
        return;
      }
      await supabase
        .from('monopoly_properties')
        .update({ houses: prop.houses + 1 })
        .eq('game_id', game.id)
        .eq('property_index', propertyIndex);
      await supabase
        .from('monopoly_players')
        .update({ money: myPlayer.money - space.houseCost })
        .eq('game_id', game.id)
        .eq('player_id', currentPlayer.id);
      toast({
        title:
          prop.houses === 4
            ? 'Hôtel construit !'
            : `Maison ${prop.houses + 1} construite !`,
      });
    },
    [game, myPlayer, properties, currentPlayer.id, toast],
  );

  const mortgageProperty = useCallback(
    async (propertyIndex: number) => {
      if (!game || !myPlayer) return;
      const space = BOARD_SPACES[propertyIndex];
      const prop = properties.find((p) => p.property_index === propertyIndex);
      if (!prop || prop.owner_id !== currentPlayer.id) return;
      if (prop.is_mortgaged) {
        const cost = Math.floor((space.mortgage || 0) * 1.1);
        if (myPlayer.money < cost) {
          toast({ title: "Pas assez d'argent !", variant: 'destructive' });
          return;
        }
        await supabase
          .from('monopoly_properties')
          .update({ is_mortgaged: false })
          .eq('game_id', game.id)
          .eq('property_index', propertyIndex);
        await supabase
          .from('monopoly_players')
          .update({ money: myPlayer.money - cost })
          .eq('game_id', game.id)
          .eq('player_id', currentPlayer.id);
      } else {
        await supabase
          .from('monopoly_properties')
          .update({ is_mortgaged: true })
          .eq('game_id', game.id)
          .eq('property_index', propertyIndex);
        await supabase
          .from('monopoly_players')
          .update({ money: myPlayer.money + (space.mortgage || 0) })
          .eq('game_id', game.id)
          .eq('player_id', currentPlayer.id);
      }
    },
    [game, myPlayer, properties, currentPlayer.id, toast],
  );

  const useJailCard = useCallback(async () => {
    if (!game || !myPlayer || !myPlayer.has_get_out_of_jail_card) return;
    await supabase
      .from('monopoly_players')
      .update({
        in_jail: false,
        jail_turns: 0,
        has_get_out_of_jail_card: myPlayer.has_get_out_of_jail_card - 1,
      })
      .eq('game_id', game.id)
      .eq('player_id', currentPlayer.id);
    await supabase
      .from('monopoly_games')
      .update({ phase: 'rolling' })
      .eq('id', game.id);
  }, [game, myPlayer, currentPlayer.id]);

  const payJailFine = useCallback(async () => {
    if (!game || !myPlayer) return;
    if (myPlayer.money < 50) {
      toast({ title: "Pas assez d'argent !", variant: 'destructive' });
      return;
    }
    await supabase
      .from('monopoly_players')
      .update({
        in_jail: false,
        jail_turns: 0,
        money: myPlayer.money - 50,
      })
      .eq('game_id', game.id)
      .eq('player_id', currentPlayer.id);
    await supabase
      .from('monopoly_games')
      .update({ phase: 'rolling' })
      .eq('id', game.id);
  }, [game, myPlayer, currentPlayer.id, toast]);

  const declareBankruptcy = useCallback(async () => {
    if (!game || !myPlayer) return;
    await supabase
      .from('monopoly_players')
      .update({ is_bankrupt: true })
      .eq('game_id', game.id)
      .eq('player_id', currentPlayer.id);
    await supabase
      .from('monopoly_properties')
      .update({ owner_id: null, houses: 0, is_mortgaged: false })
      .eq('game_id', game.id)
      .eq('owner_id', currentPlayer.id);
    await endTurn();
  }, [game, myPlayer, currentPlayer.id, endTurn]);

  /* ============================================================
     BOT AI — only the host runs it
  ============================================================ */
  const botActingRef = useRef(false);

  useEffect(() => {
    if (!currentPlayer.isHost) return;
    if (!game) return;
    if (game.is_finished) return;
    if (botActingRef.current) return;

    const turnPlayerId = game.player_order[game.current_player_index];
    if (!turnPlayerId || !isBotId(turnPlayerId)) return;

    const bot = mPlayers.find((p) => p.player_id === turnPlayerId);
    if (!bot || bot.is_bankrupt) return;

    botActingRef.current = true;

    const runBot = async () => {
      try {
        // small think delay so it feels alive
        await new Promise((r) => setTimeout(r, 900));

        if (game.phase === 'rolling') {
          // Jail decision: prefer to pay fine if rich, else try doubles
          if (bot.in_jail) {
            if (bot.has_get_out_of_jail_card > 0) {
              await supabase
                .from('monopoly_players')
                .update({
                  in_jail: false,
                  jail_turns: 0,
                  has_get_out_of_jail_card: bot.has_get_out_of_jail_card - 1,
                })
                .eq('game_id', game.id)
                .eq('player_id', bot.player_id);
              await supabase
                .from('monopoly_games')
                .update({ phase: 'rolling' })
                .eq('id', game.id);
              return;
            }
            if (bot.money > 200) {
              await supabase
                .from('monopoly_players')
                .update({
                  in_jail: false,
                  jail_turns: 0,
                  money: bot.money - 50,
                })
                .eq('game_id', game.id)
                .eq('player_id', bot.player_id);
              await supabase
                .from('monopoly_games')
                .update({ phase: 'rolling' })
                .eq('id', game.id);
              return;
            }
          }
          await rollDiceFor(bot.player_id);
        } else if (game.phase === 'buying') {
          const space = BOARD_SPACES[bot.position];
          const price = space.price || 0;
          // Buy if remaining cash stays above safety buffer
          if (bot.money - price >= 200 && Math.random() > 0.15) {
            await buyPropertyFor(bot.player_id);
          } else {
            setMessage(`${bot.player_name} ne veut pas acheter.`);
            await checkEndTurn();
          }
        } else if (game.phase === 'card' && currentCard) {
          await executeCardFor(bot.player_id, currentCard);
        } else if (game.phase === 'bankrupt' || bot.money < 0) {
          await supabase
            .from('monopoly_players')
            .update({ is_bankrupt: true })
            .eq('game_id', game.id)
            .eq('player_id', bot.player_id);
          await supabase
            .from('monopoly_properties')
            .update({ owner_id: null, houses: 0, is_mortgaged: false })
            .eq('game_id', game.id)
            .eq('owner_id', bot.player_id);
          await endTurn();
        }
      } catch (e) {
        console.error('[Monopoly bot] error:', e);
      } finally {
        // Allow next bot tick after a short cooldown
        setTimeout(() => {
          botActingRef.current = false;
        }, 300);
      }
    };

    runBot();
  }, [
    currentPlayer.isHost,
    game?.phase,
    game?.current_player_index,
    game?.is_finished,
    mPlayers,
    currentCard,
    rollDiceFor,
    buyPropertyFor,
    executeCardFor,
    checkEndTurn,
    endTurn,
    game,
  ]);

  /* ============================================================
     SAFETY: if game is stuck on 'rolled' for some reason, advance
  ============================================================ */
  useEffect(() => {
    if (!currentPlayer.isHost) return;
    if (!game) return;
    if (game.phase !== 'rolled') return;
    const t = setTimeout(() => {
      // re-check state and force checkEndTurn or endTurn
      checkEndTurn();
    }, 3500);
    return () => clearTimeout(t);
  }, [game?.phase, currentPlayer.isHost, checkEndTurn]);

  return {
    game,
    mPlayers,
    properties,
    currentCard,
    message,
    animatingTo,
    isMyTurn,
    currentTurnPlayer,
    myPlayer,
    rollDice,
    buyProperty,
    skipBuy,
    executeCard,
    buyHouse,
    mortgageProperty,
    useJailCard,
    payJailFine,
    declareBankruptcy,
    endTurn,
  };
}
