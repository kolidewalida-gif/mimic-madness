## Audit des problèmes de synchronisation multijoueur

Après inspection de l'ensemble des hooks/composants utilisant Supabase Realtime, voici les problèmes confirmés et les correctifs.

### 1. REPLICA IDENTITY manquant sur la majorité des tables temps‑réel
Sur 33 tables publiées dans `supabase_realtime`, seules 4 sont en `REPLICA IDENTITY FULL` (lobbies, direct_messages, audio_phone_recordings, audio_phone_rounds). Pour les autres, les événements UPDATE/DELETE arrivent avec un `payload.old` vide (PK seule) → la détection de kick (`useLobbySync`), le diff des UPDATE Monopoly/Undercover/Quiz/Pixoguess, le suivi des votes, etc. sont fragiles ou cassés.

**Fix:** migration SQL qui passe en `REPLICA IDENTITY FULL` toutes les tables publiées en realtime.

### 2. `useLobbySync` : re-souscription en boucle
L'effet de souscription a `players.length`, `markConnected`, `markDisconnected`, `cleanupDisconnectedPlayers`, `toast` dans ses deps. Chaque arrivée/départ démonte et reconstruit le canal Realtime + l'interval heartbeat → événements perdus, races, "Lobby was deleted" parasite.

**Fix:** réduire les deps à `[lobby?.id]`, stabiliser les helpers via `useRef` (lobby/players courants), garder un seul canal pour la durée du lobby.

### 3. `useLobbySync` : détection de kick basée sur `payload.old`
Sans REPLICA IDENTITY FULL, `payload.old.player_id` est `undefined` → le joueur kické ne voit rien jusqu'au prochain heartbeat (5 s).

**Fix:** corrigé par #1 + fallback déjà présent via `fetchPlayers` (garder).

### 4. `useOnlinePresence` : `updatePresence` inopérant
La fonction crée un nouveau `supabase.channel('online-users')` et appelle `.track()` sans `.subscribe()` → l'appel est silencieusement ignoré. De plus deux canaux portent le même nom dans le hook.

**Fix:** garder une seule référence `channelRef`, exposer `updatePresence` qui re‑track sur ce canal souscrit.

### 5. Noms de canaux non uniques par instance
`friendships-changes`, `game-invitations-realtime`, `player-rewards`, `online-users` sont partagés entre tous les utilisateurs. Sur Supabase Realtime, un même nom est OK (rooms), mais des handlers globaux non filtrés font que chaque client reçoit *tous* les events → re-fetchs inutiles, et bugs de scope (ex: `player-rewards` ne filtre pas par user_id).

**Fix:** suffixer par `user.id` quand pertinent, et/ou ajouter un `filter` postgres_changes (`receiver_id=eq.${user.id}`, `user_id=eq.${user.id}`).

### 6. Heartbeat / cleanup
L'intervalle de 5 s appelle `markConnected`, `cleanupDisconnectedPlayers`, `fetchPlayers`. Combiné avec #2, il fuit. Une fois #2 corrigé, OK.

### Plan d'implémentation

1. **Migration SQL** — `ALTER TABLE ... REPLICA IDENTITY FULL` pour toutes les tables publiées en realtime (sauf celles déjà FULL).
2. **`src/hooks/useLobbySync.tsx`** — refonte de l'effet de souscription (deps `[lobby?.id]`), refs pour `lobby`/`players`/`currentPlayerId`, suppression du re-mount sur `players.length`.
3. **`src/hooks/useOnlinePresence.tsx`** — `channelRef`, `updatePresence` réutilise le canal souscrit.
4. **`src/hooks/useFriends.tsx`** — ajouter `filter` `requester_id=eq.${user.id}` et `addressee_id=eq.${user.id}` (deux listeners) + suffixe `user.id` au channel name.
5. **`src/hooks/useGameInvitations.tsx`** — `filter: receiver_id=eq.${user.id}` + suffixe.
6. **`src/hooks/usePlayerLevel.tsx`** — `filter: user_id=eq.${user.id}` sur `player-rewards` + suffixe.

Pas de changement fonctionnel visible côté UI : seuls la robustesse et la latence des updates temps‑réel s'améliorent (kick instantané, statuts présence corrects, pas de re-fetchs inutiles, fin des re-subscribe en boucle dans le lobby).
