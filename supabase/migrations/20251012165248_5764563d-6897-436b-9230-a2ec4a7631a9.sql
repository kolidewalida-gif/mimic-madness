-- Fix function to have proper search_path
DROP FUNCTION IF EXISTS public.update_lobby_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_lobby_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER update_lobbies_updated_at
  BEFORE UPDATE ON public.lobbies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lobby_updated_at();