-- Retirer pour de bon l'exécution des fonctions internes.
--
-- La migration précédente révoquait `execute` sur `anon` et `authenticated`, et
-- la sonde a montré que ça ne servait à rien : PostgreSQL accorde `EXECUTE` au
-- pseudo-rôle `PUBLIC` à la création de toute fonction, et `anon` en hérite. La
-- preuve était nette — `set_lobby_player_connection`, censée être fermée,
-- répondait encore 204 à un appel anonyme, ce qui permettait toujours de marquer
-- un adversaire déconnecté et de le faire expulser par le ménage soixante
-- secondes plus tard.
--
-- Il faut donc révoquer sur `public`, puis re-accorder nommément aux rôles qui
-- en ont besoin.

revoke execute on function public.set_lobby_player_connection(uuid, text, boolean) from public;
revoke execute on function public.identity_is_registered(text) from public;
revoke execute on function public.identity_belongs_to_caller(text) from public;
revoke execute on function public.lobby_seat_holder(uuid, text) from public;
revoke execute on function public.hash_lobby_token(text) from public;
revoke execute on function public.enforce_chat_rate_limit() from public;
revoke execute on function public.guard_lobby_ownership() from public;

-- Le ménage automatique tourne encore côté serveur avec la clé de service.
grant execute on function public.set_lobby_player_connection(uuid, text, boolean) to service_role;

-- Les fonctions de siège, elles, sont bien destinées au navigateur : elles
-- vérifient le jeton elles-mêmes, c'est tout leur intérêt.
grant execute on function public.claim_lobby_seat(uuid, text, text, boolean, text) to anon, authenticated;
grant execute on function public.touch_lobby_seat(uuid, text, boolean) to anon, authenticated;
grant execute on function public.release_lobby_seat(uuid, text) to anon, authenticated;
grant execute on function public.kick_lobby_player(uuid, text, text) to anon, authenticated;
grant execute on function public.transfer_lobby_host(uuid, text, text) to anon, authenticated;
grant execute on function public.prune_lobby_players(uuid) to anon, authenticated;

-- `cleanup_old_game_data` et `cleanup_old_hidden_posts` sont des tâches de
-- maintenance : elles suppriment en masse et n'ont rien à faire au bout d'un
-- appel anonyme, où elles offraient un déni de service à une requête.
revoke execute on function public.cleanup_old_game_data() from public;
revoke execute on function public.cleanup_stale_quest_progress() from public;
revoke execute on function public.cleanup_old_hidden_posts() from public;
grant execute on function public.cleanup_old_game_data() to service_role;
grant execute on function public.cleanup_stale_quest_progress() to service_role;
grant execute on function public.cleanup_old_hidden_posts() to service_role;

-- Les fonctions de déclencheur ne s'appellent jamais directement. Les laisser
-- exposées sur `/rest/v1/rpc/` était une porte ouverte sur des effets de bord
-- (les compteurs sociaux, les notifications) sans passer par l'événement qui
-- les justifie.
revoke execute on function public.bump_social_post_likes_count() from public;
revoke execute on function public.sync_social_comments_count() from public;
revoke execute on function public.notify_on_follow() from public;
revoke execute on function public.notify_on_like() from public;
revoke execute on function public.notify_on_reaction() from public;
