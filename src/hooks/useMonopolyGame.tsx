import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BOARD_SPACES, CHANCE_CARDS, COMMUNITY_CARDS, calculateRent, getPropertiesInGroup, type GameCard, type TokenType } from '@/lib/monopolyBoard';
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

export type MonopolyPhase = 'rolling' | 'rolled' | 'buying' | 'paying_rent' | 'card' | 'jail_decision' | 'trading' | 'managing' | 'bankrupt' | 'finished';

export function useMonopolyGame(lobbyId: string, currentPlayer: Player, players: Player[]) {
  const [game, setGame] = useState<MonopolyGame | null>(null);
  const [mPlayers, setMPlayers] = useState<MonopolyPlayer[]>([]);
  const [properties, setProperties] = useState<MonopolyProperty[]>([]);
  const [currentCard, setCurrentCard] = useState<GameCard | null>(null);
  const [message, setMessage] = useState<string>('');
  const [animatingTo, setAnimatingTo] = useState<number | null>(null);
  const { toast } = useToast();
  const gameIdRef = useRef<string | null>(null);

  const isMyTurn = game ? game.player_order[game.current_player_index] === currentPlayer.id : false;
  const currentTurnPlayer = game ? mPlayers.find(p => p.player_id === game.player_order[game.current_player_index]) : null;
  const myPlayer = mPlayers.find(p => p.player_id === currentPlayer.id);

  // Initialize game
  useEffect(() => {
    const init = async () => {
      // Check existing game
      const { data: existing } = await supabase
        .from('monopoly_games')
        .select('*')
        .eq('lobby_id', lobbyId)
        .maybeSingle();

      if (existing) {
        setGame(existing as MonopolyGame);
        gameIdRef.current = existing.id;
        
        const { data: pls } = await supabase.from('monopoly_players').select('*').eq('game_id', existing.id);
        if (pls) setMPlayers(pls as MonopolyPlayer[]);
        
        const { data: props } = await supabase.from('monopoly_properties').select('*').eq('game_id', existing.id);
        if (props) setProperties(props as MonopolyProperty[]);
        return;
      }

      // Host creates game
      if (!currentPlayer.isHost) return;

      const tokens: TokenType[] = ['car', 'hat', 'shoe', 'dog', 'ship', 'thimble', 'iron', 'cannon'];
      const playerOrder = players.map(p => p.id).sort(() => Math.random() - 0.5);

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
        return;
      }

      gameIdRef.current = newGame.id;

      // Create player entries
      const playerInserts = playerOrder.map((pid, i) => ({
        game_id: newGame.id,
        player_id: pid,
        player_name: players.find(p => p.id === pid)?.name || 'Joueur',
        token_type: tokens[i % tokens.length],
        position: 0,
        money: 1500,
        player_order: i,
      }));

      await supabase.from('monopoly_players').insert(playerInserts);

      // Create property entries for all buyable spaces
      const propInserts = BOARD_SPACES
        .filter(s => s.type === 'property' || s.type === 'railroad' || s.type === 'utility')
        .map(s => ({
          game_id: newGame.id,
          property_index: s.index,
          owner_id: null,
          houses: 0,
          is_mortgaged: false,
        }));

      await supabase.from('monopoly_properties').insert(propInserts);
    };

    init();
  }, [lobbyId, currentPlayer.isHost]);

  // Real-time subscriptions
  useEffect(() => {
    if (!lobbyId) return;

    const channel = supabase
      .channel(`monopoly:${lobbyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monopoly_games', filter: `lobby_id=eq.${lobbyId}` }, (payload: any) => {
        if (payload.new) {
          setGame(payload.new as MonopolyGame);
          gameIdRef.current = payload.new.id;
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [lobbyId]);

  useEffect(() => {
    if (!gameIdRef.current) return;
    const gid = gameIdRef.current;

    const ch1 = supabase
      .channel(`monopoly-players:${gid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monopoly_players', filter: `game_id=eq.${gid}` }, async () => {
        const { data } = await supabase.from('monopoly_players').select('*').eq('game_id', gid);
        if (data) setMPlayers(data as MonopolyPlayer[]);
      })
      .subscribe();

    const ch2 = supabase
      .channel(`monopoly-props:${gid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monopoly_properties', filter: `game_id=eq.${gid}` }, async () => {
        const { data } = await supabase.from('monopoly_properties').select('*').eq('game_id', gid);
        if (data) setProperties(data as MonopolyProperty[]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [game?.id]);

  // Roll dice
  const rollDice = useCallback(async () => {
    if (!game || !isMyTurn || !myPlayer) return;
    
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const isDoubles = d1 === d2;
    const total = d1 + d2;

    // Check for 3 doubles -> jail
    if (isDoubles && game.doubles_count >= 2) {
      await supabase.from('monopoly_players').update({ in_jail: true, position: 10 }).eq('game_id', game.id).eq('player_id', currentPlayer.id);
      await supabase.from('monopoly_games').update({ phase: 'rolled', last_dice_1: d1, last_dice_2: d2, doubles_count: 0 }).eq('id', game.id);
      setMessage('3 doubles ! En prison !');
      setTimeout(() => endTurn(), 2000);
      return;
    }

    // In jail logic
    if (myPlayer.in_jail) {
      if (isDoubles) {
        await supabase.from('monopoly_players').update({ in_jail: false, jail_turns: 0 }).eq('game_id', game.id).eq('player_id', currentPlayer.id);
        setMessage('Double ! Vous sortez de prison !');
      } else if (myPlayer.jail_turns >= 2) {
        // Must pay $50 after 3 turns
        await supabase.from('monopoly_players').update({
          in_jail: false,
          jail_turns: 0,
          money: myPlayer.money - 50
        }).eq('game_id', game.id).eq('player_id', currentPlayer.id);
        setMessage('3 tours en prison. Vous payez 50$ et sortez.');
      } else {
        await supabase.from('monopoly_players').update({ jail_turns: myPlayer.jail_turns + 1 }).eq('game_id', game.id).eq('player_id', currentPlayer.id);
        await supabase.from('monopoly_games').update({ phase: 'rolled', last_dice_1: d1, last_dice_2: d2 }).eq('id', game.id);
        setMessage('Pas de double. Vous restez en prison.');
        setTimeout(() => endTurn(), 2000);
        return;
      }
    }

    // Move player
    const newPos = (myPlayer.position + total) % 40;
    const passedGo = newPos < myPlayer.position;
    let newMoney = myPlayer.money + (passedGo ? 200 : 0);

    await supabase.from('monopoly_players').update({
      position: newPos,
      money: newMoney,
    }).eq('game_id', game.id).eq('player_id', currentPlayer.id);

    await supabase.from('monopoly_games').update({
      last_dice_1: d1,
      last_dice_2: d2,
      doubles_count: isDoubles ? game.doubles_count + 1 : 0,
      phase: 'rolled',
    }).eq('id', game.id);

    setAnimatingTo(newPos);

    if (passedGo) {
      setMessage(`Vous passez par le Départ ! +200$`);
    }

    // Process landing
    setTimeout(() => handleLanding(newPos, newMoney, total), 1500);
  }, [game, isMyTurn, myPlayer, properties, mPlayers]);

  const handleLanding = useCallback(async (position: number, money: number, diceTotal: number) => {
    if (!game) return;
    const space = BOARD_SPACES[position];
    setAnimatingTo(null);

    switch (space.type) {
      case 'go':
        setMessage('Vous êtes sur le Départ !');
        await checkEndTurn();
        break;

      case 'property':
      case 'railroad':
      case 'utility': {
        const prop = properties.find(p => p.property_index === position);
        if (!prop) break;

        if (!prop.owner_id) {
          await supabase.from('monopoly_games').update({ phase: 'buying' }).eq('id', game.id);
          setMessage(`${space.nameFr} est disponible pour ${space.price}$ !`);
        } else if (prop.owner_id !== currentPlayer.id && !prop.is_mortgaged) {
          const ownerProps = properties.filter(p => p.owner_id === prop.owner_id);
          const rent = calculateRent(space, prop.houses, ownerProps, diceTotal);
          const owner = mPlayers.find(p => p.player_id === prop.owner_id);
          
          setMessage(`Loyer de ${rent}$ à payer à ${owner?.player_name || 'propriétaire'}`);
          
          await supabase.from('monopoly_players').update({ money: money - rent }).eq('game_id', game.id).eq('player_id', currentPlayer.id);
          if (owner) {
            await supabase.from('monopoly_players').update({ money: owner.money + rent }).eq('game_id', game.id).eq('player_id', owner.player_id);
          }
          
          if (money - rent < 0) {
            await supabase.from('monopoly_games').update({ phase: 'bankrupt' }).eq('id', game.id);
          } else {
            await checkEndTurn();
          }
        } else {
          setMessage(`Vous êtes sur votre propriété.`);
          await checkEndTurn();
        }
        break;
      }

      case 'tax':
        const tax = space.taxAmount || 0;
        setMessage(`Taxe de ${tax}$ !`);
        await supabase.from('monopoly_players').update({ money: money - tax }).eq('game_id', game.id).eq('player_id', currentPlayer.id);
        await supabase.from('monopoly_games').update({ free_parking_pot: (game.free_parking_pot || 0) + tax }).eq('id', game.id);
        if (money - tax < 0) {
          await supabase.from('monopoly_games').update({ phase: 'bankrupt' }).eq('id', game.id);
        } else {
          await checkEndTurn();
        }
        break;

      case 'chance':
      case 'community': {
        const cards = space.type === 'chance' ? CHANCE_CARDS : COMMUNITY_CARDS;
        const card = cards[Math.floor(Math.random() * cards.length)];
        setCurrentCard(card);
        setMessage(card.textFr);
        await supabase.from('monopoly_games').update({ phase: 'card' }).eq('id', game.id);
        break;
      }

      case 'go_to_jail':
        setMessage('Allez en Prison !');
        await supabase.from('monopoly_players').update({ position: 10, in_jail: true }).eq('game_id', game.id).eq('player_id', currentPlayer.id);
        setTimeout(() => endTurn(), 2000);
        break;

      case 'jail':
        setMessage('Simple visite !');
        await checkEndTurn();
        break;

      case 'free_parking':
        const pot = game.free_parking_pot || 0;
        if (pot > 0) {
          setMessage(`Parc Gratuit ! Vous récupérez ${pot}$ !`);
          await supabase.from('monopoly_players').update({ money: money + pot }).eq('game_id', game.id).eq('player_id', currentPlayer.id);
          await supabase.from('monopoly_games').update({ free_parking_pot: 0 }).eq('id', game.id);
        } else {
          setMessage('Parc Gratuit !');
        }
        await checkEndTurn();
        break;
    }
  }, [game, properties, mPlayers, currentPlayer.id]);

  const checkEndTurn = useCallback(async () => {
    if (!game) return;
    // If doubles, player rolls again
    if (game.last_dice_1 === game.last_dice_2 && game.last_dice_1) {
      await supabase.from('monopoly_games').update({ phase: 'rolling' }).eq('id', game.id);
      setMessage('Double ! Relancez les dés !');
    } else {
      setTimeout(() => endTurn(), 2000);
    }
  }, [game]);

  const endTurn = useCallback(async () => {
    if (!game) return;
    
    // Find next non-bankrupt player
    let nextIdx = (game.current_player_index + 1) % game.player_order.length;
    let attempts = 0;
    while (attempts < game.player_order.length) {
      const nextPlayerId = game.player_order[nextIdx];
      const nextP = mPlayers.find(p => p.player_id === nextPlayerId);
      if (nextP && !nextP.is_bankrupt) break;
      nextIdx = (nextIdx + 1) % game.player_order.length;
      attempts++;
    }

    // Check win condition
    const activePlayers = mPlayers.filter(p => !p.is_bankrupt);
    if (activePlayers.length <= 1) {
      const winner = activePlayers[0];
      await supabase.from('monopoly_games').update({
        is_finished: true,
        phase: 'finished',
        winner_id: winner?.player_id,
        winner_name: winner?.player_name,
      }).eq('id', game.id);
      return;
    }

    await supabase.from('monopoly_games').update({
      current_player_index: nextIdx,
      phase: 'rolling',
      doubles_count: 0,
    }).eq('id', game.id);
  }, [game, mPlayers]);

  const buyProperty = useCallback(async () => {
    if (!game || !myPlayer) return;
    const space = BOARD_SPACES[myPlayer.position];
    if (!space.price) return;

    if (myPlayer.money < space.price) {
      toast({ title: 'Pas assez d\'argent !', variant: 'destructive' });
      return;
    }

    await supabase.from('monopoly_properties').update({ owner_id: currentPlayer.id }).eq('game_id', game.id).eq('property_index', myPlayer.position);
    await supabase.from('monopoly_players').update({ money: myPlayer.money - space.price }).eq('game_id', game.id).eq('player_id', currentPlayer.id);
    
    setMessage(`${space.nameFr} achetée !`);
    await checkEndTurn();
  }, [game, myPlayer, currentPlayer.id]);

  const skipBuy = useCallback(async () => {
    if (!game) return;
    setMessage('Propriété ignorée.');
    await checkEndTurn();
  }, [game]);

  const executeCard = useCallback(async () => {
    if (!game || !myPlayer || !currentCard) return;

    switch (currentCard.action) {
      case 'collect':
        await supabase.from('monopoly_players').update({ money: myPlayer.money + (currentCard.amount || 0) }).eq('game_id', game.id).eq('player_id', currentPlayer.id);
        break;
      case 'pay':
        await supabase.from('monopoly_players').update({ money: myPlayer.money - (currentCard.amount || 0) }).eq('game_id', game.id).eq('player_id', currentPlayer.id);
        break;
      case 'move_to':
        const passGo = (currentCard.position || 0) < myPlayer.position;
        await supabase.from('monopoly_players').update({
          position: currentCard.position || 0,
          money: myPlayer.money + (passGo ? 200 : 0),
        }).eq('game_id', game.id).eq('player_id', currentPlayer.id);
        break;
      case 'move_back':
        const newPos = (myPlayer.position - (currentCard.amount || 0) + 40) % 40;
        await supabase.from('monopoly_players').update({ position: newPos }).eq('game_id', game.id).eq('player_id', currentPlayer.id);
        break;
      case 'jail':
        await supabase.from('monopoly_players').update({ position: 10, in_jail: true }).eq('game_id', game.id).eq('player_id', currentPlayer.id);
        break;
      case 'get_out_of_jail':
        await supabase.from('monopoly_players').update({ has_get_out_of_jail_card: myPlayer.has_get_out_of_jail_card + 1 }).eq('game_id', game.id).eq('player_id', currentPlayer.id);
        break;
      case 'repairs': {
        const myProps = properties.filter(p => p.owner_id === currentPlayer.id);
        let cost = 0;
        myProps.forEach(p => {
          if (p.houses === 5) cost += (currentCard.perHotel || 0);
          else cost += p.houses * (currentCard.perHouse || 0);
        });
        await supabase.from('monopoly_players').update({ money: myPlayer.money - cost }).eq('game_id', game.id).eq('player_id', currentPlayer.id);
        break;
      }
      case 'pay_each': {
        const others = mPlayers.filter(p => p.player_id !== currentPlayer.id && !p.is_bankrupt);
        const total = others.length * (currentCard.amount || 0);
        await supabase.from('monopoly_players').update({ money: myPlayer.money - total }).eq('game_id', game.id).eq('player_id', currentPlayer.id);
        for (const other of others) {
          await supabase.from('monopoly_players').update({ money: other.money + (currentCard.amount || 0) }).eq('game_id', game.id).eq('player_id', other.player_id);
        }
        break;
      }
      case 'collect_each': {
        const others2 = mPlayers.filter(p => p.player_id !== currentPlayer.id && !p.is_bankrupt);
        const total2 = others2.length * (currentCard.amount || 0);
        await supabase.from('monopoly_players').update({ money: myPlayer.money + total2 }).eq('game_id', game.id).eq('player_id', currentPlayer.id);
        for (const other of others2) {
          await supabase.from('monopoly_players').update({ money: other.money - (currentCard.amount || 0) }).eq('game_id', game.id).eq('player_id', other.player_id);
        }
        break;
      }
    }

    setCurrentCard(null);
    await checkEndTurn();
  }, [game, myPlayer, currentCard, properties, mPlayers]);

  const buyHouse = useCallback(async (propertyIndex: number) => {
    if (!game || !myPlayer) return;
    const space = BOARD_SPACES[propertyIndex];
    const prop = properties.find(p => p.property_index === propertyIndex);
    if (!prop || prop.owner_id !== currentPlayer.id || !space.houseCost) return;
    if (prop.houses >= 5) return;
    if (myPlayer.money < space.houseCost) {
      toast({ title: 'Pas assez d\'argent !', variant: 'destructive' });
      return;
    }

    // Check monopoly
    const groupProps = getPropertiesInGroup(space.group!);
    const ownsAll = groupProps.every(gp => properties.some(op => op.property_index === gp.index && op.owner_id === currentPlayer.id));
    if (!ownsAll) {
      toast({ title: 'Vous devez posséder tout le groupe !', variant: 'destructive' });
      return;
    }

    await supabase.from('monopoly_properties').update({ houses: prop.houses + 1 }).eq('game_id', game.id).eq('property_index', propertyIndex);
    await supabase.from('monopoly_players').update({ money: myPlayer.money - space.houseCost }).eq('game_id', game.id).eq('player_id', currentPlayer.id);
    
    toast({ title: prop.houses === 4 ? 'Hôtel construit !' : `Maison ${prop.houses + 1} construite !` });
  }, [game, myPlayer, properties]);

  const mortgageProperty = useCallback(async (propertyIndex: number) => {
    if (!game || !myPlayer) return;
    const space = BOARD_SPACES[propertyIndex];
    const prop = properties.find(p => p.property_index === propertyIndex);
    if (!prop || prop.owner_id !== currentPlayer.id) return;

    if (prop.is_mortgaged) {
      // Unmortgage
      const cost = Math.floor((space.mortgage || 0) * 1.1);
      if (myPlayer.money < cost) {
        toast({ title: 'Pas assez d\'argent !', variant: 'destructive' });
        return;
      }
      await supabase.from('monopoly_properties').update({ is_mortgaged: false }).eq('game_id', game.id).eq('property_index', propertyIndex);
      await supabase.from('monopoly_players').update({ money: myPlayer.money - cost }).eq('game_id', game.id).eq('player_id', currentPlayer.id);
    } else {
      await supabase.from('monopoly_properties').update({ is_mortgaged: true }).eq('game_id', game.id).eq('property_index', propertyIndex);
      await supabase.from('monopoly_players').update({ money: myPlayer.money + (space.mortgage || 0) }).eq('game_id', game.id).eq('player_id', currentPlayer.id);
    }
  }, [game, myPlayer, properties]);

  const useJailCard = useCallback(async () => {
    if (!game || !myPlayer || !myPlayer.has_get_out_of_jail_card) return;
    await supabase.from('monopoly_players').update({
      in_jail: false,
      jail_turns: 0,
      has_get_out_of_jail_card: myPlayer.has_get_out_of_jail_card - 1,
    }).eq('game_id', game.id).eq('player_id', currentPlayer.id);
    await supabase.from('monopoly_games').update({ phase: 'rolling' }).eq('id', game.id);
  }, [game, myPlayer]);

  const payJailFine = useCallback(async () => {
    if (!game || !myPlayer) return;
    if (myPlayer.money < 50) {
      toast({ title: 'Pas assez d\'argent !', variant: 'destructive' });
      return;
    }
    await supabase.from('monopoly_players').update({
      in_jail: false,
      jail_turns: 0,
      money: myPlayer.money - 50,
    }).eq('game_id', game.id).eq('player_id', currentPlayer.id);
    await supabase.from('monopoly_games').update({ phase: 'rolling' }).eq('id', game.id);
  }, [game, myPlayer]);

  const declareBankruptcy = useCallback(async () => {
    if (!game || !myPlayer) return;
    await supabase.from('monopoly_players').update({ is_bankrupt: true }).eq('game_id', game.id).eq('player_id', currentPlayer.id);
    // Release all properties
    await supabase.from('monopoly_properties').update({ owner_id: null, houses: 0, is_mortgaged: false }).eq('game_id', game.id).eq('owner_id', currentPlayer.id);
    await endTurn();
  }, [game, myPlayer]);

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
