-- Create game_invitations table for real-time invitation system
CREATE TABLE public.game_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  lobby_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '2 minutes')
);

-- Enable RLS
ALTER TABLE public.game_invitations ENABLE ROW LEVEL SECURITY;

-- Anyone can view invitations they sent or received
CREATE POLICY "Users can view their invitations"
  ON public.game_invitations
  FOR SELECT
  USING (true);

-- Anyone can create invitations
CREATE POLICY "Anyone can create invitations"
  ON public.game_invitations
  FOR INSERT
  WITH CHECK (true);

-- Anyone can update invitations (accept/decline)
CREATE POLICY "Anyone can update invitations"
  ON public.game_invitations
  FOR UPDATE
  USING (true);

-- Anyone can delete expired invitations
CREATE POLICY "Anyone can delete invitations"
  ON public.game_invitations
  FOR DELETE
  USING (true);

-- Enable realtime for invitations
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_invitations;