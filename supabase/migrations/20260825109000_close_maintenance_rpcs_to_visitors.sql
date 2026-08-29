-- Fermer pour de bon les fonctions de maintenance.
--
-- Deuxième leçon sur les privilèges de ce projet. La première : PostgreSQL
-- accorde `EXECUTE` au pseudo-rôle `PUBLIC` à la création d'une fonction. La
-- seconde, découverte en relisant les ACL réelles : le schéma `public` de ce
-- projet Supabase porte un `ALTER DEFAULT PRIVILEGES` qui accorde en plus
-- `EXECUTE` nommément à `anon` et `authenticated`. Révoquer sur `public` ne
-- retire donc pas ces deux droits-là, et la sonde l'a confirmé —
-- `list_player_reports` répondait encore à un appel anonyme.
--
-- Ce qui est réellement dangereux ici, ce sont les trois fonctions de ménage :
-- elles suppriment en masse, sans argument, et un appel anonyme suffisait à les
-- déclencher. Un déni de service en une requête.
--
-- Les fonctions de déclencheur signalées par le linter (`notify_on_*`,
-- `bump_social_post_likes_count`, `sync_social_comments_count`,
-- `enforce_chat_rate_limit`, `guard_lobby_ownership`) sont volontairement
-- laissées telles quelles : PostgreSQL refuse de les appeler autrement que
-- depuis un déclencheur, l'exposition est donc nulle et une révocation
-- risquerait de gêner l'évaluation des déclencheurs sans rien gagner.
--
-- `text_has_no_control_chars` doit également rester exécutable : elle est
-- appelée par les contraintes CHECK du contenu joueur, et ces expressions sont
-- évaluées avec les droits de l'appelant. La fermer casserait toutes les
-- écritures de chat.

revoke execute on function public.cleanup_old_game_data() from anon, authenticated;
revoke execute on function public.cleanup_stale_quest_progress() from anon, authenticated;
revoke execute on function public.cleanup_old_hidden_posts() from anon, authenticated;

-- La file de signalements n'a rien à dire à un visiteur non connecté. La
-- fonction revérifie déjà le rôle admin dans son corps, mais autant ne pas
-- laisser la porte entrouverte.
revoke execute on function public.list_player_reports(integer) from anon;
