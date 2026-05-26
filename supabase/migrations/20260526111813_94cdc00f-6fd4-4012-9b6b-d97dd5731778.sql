-- 1) Remove sensitive tables from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_roles;

-- 2) Lock down internal SECURITY DEFINER functions
-- These are trigger / signup / maintenance helpers and should NOT be callable via PostgREST.
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_lobby_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_friend_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_lobbies() FROM PUBLIC, anon, authenticated;

-- has_role MUST remain executable by authenticated users because it is used inside RLS policies.
-- (No change to public.has_role grants.)