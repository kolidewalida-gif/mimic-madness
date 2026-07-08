
-- Ban types
CREATE TYPE public.ban_type AS ENUM ('global', 'chat', 'lobby', 'mute');

-- USER_BANS
CREATE TABLE public.user_bans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ban_type public.ban_type NOT NULL,
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID,
  revoke_reason TEXT
);

CREATE INDEX idx_user_bans_user_active ON public.user_bans(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_user_bans_user_type ON public.user_bans(user_id, ban_type);

GRANT SELECT, INSERT, UPDATE ON public.user_bans TO authenticated;
GRANT ALL ON public.user_bans TO service_role;

ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bans"
  ON public.user_bans FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all bans"
  ON public.user_bans FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create bans"
  ON public.user_bans FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE POLICY "Admins can update bans"
  ON public.user_bans FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Helper: is user currently banned for a given type
CREATE OR REPLACE FUNCTION public.is_user_banned(_user_id UUID, _type public.ban_type)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_bans
    WHERE user_id = _user_id
      AND ban_type = _type
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- GLOBAL_ANNOUNCEMENTS
CREATE TABLE public.global_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_announcements_created ON public.global_announcements(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_announcements TO authenticated;
GRANT ALL ON public.global_announcements TO service_role;

ALTER TABLE public.global_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read announcements"
  ON public.global_announcements FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage announcements"
  ON public.global_announcements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

-- ANNOUNCEMENT_ACKS
CREATE TABLE public.announcement_acks (
  announcement_id UUID NOT NULL REFERENCES public.global_announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  acked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);

GRANT SELECT, INSERT ON public.announcement_acks TO authenticated;
GRANT ALL ON public.announcement_acks TO service_role;

ALTER TABLE public.announcement_acks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own acks"
  ON public.announcement_acks FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert their own acks"
  ON public.announcement_acks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- LOBBY_PLAYERS additions for admin
ALTER TABLE public.lobby_players
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_ghost BOOLEAN NOT NULL DEFAULT false;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_bans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_announcements;

-- Enforce chat/social bans in existing RPCs
CREATE OR REPLACE FUNCTION public.publish_social_post(p_clip_id text, p_challenge_clip_id text, p_caption text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_user UUID := auth.uid(); v_clip_owner TEXT; v_today_count INTEGER;
        v_owner_name TEXT; v_post_id UUID; v_week_key TEXT; v_caption TEXT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF public.is_user_banned(v_user, 'global') THEN RAISE EXCEPTION 'user is banned'; END IF;
  IF public.is_user_banned(v_user, 'chat') THEN RAISE EXCEPTION 'user is banned from chat'; END IF;
  IF p_clip_id IS NULL OR char_length(p_clip_id) = 0 THEN RAISE EXCEPTION 'invalid clip'; END IF;
  v_caption := COALESCE(NULLIF(btrim(p_caption), ''), NULL);
  IF v_caption IS NOT NULL AND char_length(v_caption) > 200 THEN
    v_caption := substring(v_caption FROM 1 FOR 200);
  END IF;
  SELECT player_id INTO v_clip_owner FROM public.video_clips WHERE id = p_clip_id;
  IF v_clip_owner IS NULL THEN RAISE EXCEPTION 'clip not found'; END IF;
  SELECT count(*) INTO v_today_count FROM public.social_posts
    WHERE owner_id = v_user AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC');
  IF v_today_count >= 3 THEN RAISE EXCEPTION 'daily post quota reached'; END IF;
  SELECT COALESCE(display_name, 'Joueur') INTO v_owner_name FROM public.profiles WHERE user_id = v_user;
  IF v_owner_name IS NULL THEN v_owner_name := 'Joueur'; END IF;
  v_week_key := to_char(now() AT TIME ZONE 'UTC', 'IYYY"-W"IW');
  INSERT INTO public.social_posts (clip_id, challenge_clip_id, owner_id, owner_name, caption, week_key)
    VALUES (p_clip_id, p_challenge_clip_id, v_user, v_owner_name, v_caption, v_week_key)
    RETURNING id INTO v_post_id;
  RETURN v_post_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.toggle_social_like(p_post_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_user UUID := auth.uid(); v_liked BOOLEAN; v_post_exists BOOLEAN;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF public.is_user_banned(v_user, 'global') THEN RAISE EXCEPTION 'user is banned'; END IF;
  IF public.is_user_banned(v_user, 'chat') THEN RAISE EXCEPTION 'user is banned from chat'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.social_posts WHERE id = p_post_id AND is_hidden = false) INTO v_post_exists;
  IF NOT v_post_exists THEN RETURN false; END IF;
  SELECT EXISTS (SELECT 1 FROM public.social_post_likes WHERE post_id = p_post_id AND user_id = v_user) INTO v_liked;
  IF v_liked THEN
    DELETE FROM public.social_post_likes WHERE post_id = p_post_id AND user_id = v_user;
    RETURN false;
  ELSE
    INSERT INTO public.social_post_likes (post_id, user_id) VALUES (p_post_id, v_user) ON CONFLICT DO NOTHING;
    RETURN true;
  END IF;
END;
$function$;

-- Admin RPC: force join any lobby
CREATE OR REPLACE FUNCTION public.admin_join_lobby(p_lobby_id UUID, p_player_id TEXT, p_display_name TEXT, p_ghost BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL OR NOT public.has_role(v_user, 'admin') THEN
    RAISE EXCEPTION 'admin required';
  END IF;
  INSERT INTO public.lobby_players (lobby_id, player_id, player_name, is_host, is_admin, is_ghost, connection_status)
  VALUES (p_lobby_id, p_player_id, COALESCE(p_display_name, 'ADMIN'), false, true, COALESCE(p_ghost, false), 'connected')
  ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;

-- Broadcast a global kick via realtime is handled client-side via user_bans subscription
