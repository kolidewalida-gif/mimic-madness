
-- Add comments_count column to social_posts if missing
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS comments_count INTEGER NOT NULL DEFAULT 0;

-- Comments table
CREATE TABLE public.social_post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 300),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_social_post_comments_post ON public.social_post_comments(post_id, created_at);

GRANT SELECT ON public.social_post_comments TO anon;
GRANT SELECT, INSERT, DELETE ON public.social_post_comments TO authenticated;
GRANT ALL ON public.social_post_comments TO service_role;

ALTER TABLE public.social_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_read_all" ON public.social_post_comments
  FOR SELECT USING (true);

CREATE POLICY "comments_insert_own" ON public.social_post_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_delete_own" ON public.social_post_comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Counter trigger
CREATE OR REPLACE FUNCTION public.bump_social_post_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.social_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.social_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_bump_social_post_comments_count
AFTER INSERT OR DELETE ON public.social_post_comments
FOR EACH ROW EXECUTE FUNCTION public.bump_social_post_comments_count();

-- Realtime
ALTER TABLE public.social_post_comments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_post_comments;
