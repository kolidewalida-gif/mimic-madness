-- Create table for imitations (players imitating other players' reversed phrases)
CREATE TABLE public.audio_phone_imitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES public.audio_phone_rounds(id) ON DELETE CASCADE,
  original_recording_id UUID NOT NULL REFERENCES public.audio_phone_recordings(id) ON DELETE CASCADE,
  imitator_player_id TEXT NOT NULL,
  imitator_player_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  reversed_storage_path TEXT,
  duration_seconds NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audio_phone_imitations ENABLE ROW LEVEL SECURITY;

-- Create policies for imitations
CREATE POLICY "Allow all to select imitations"
ON public.audio_phone_imitations FOR SELECT USING (true);

CREATE POLICY "Allow all to insert imitations"
ON public.audio_phone_imitations FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all to delete imitations"
ON public.audio_phone_imitations FOR DELETE USING (true);

-- Enable realtime for the new table
ALTER PUBLICATION supabase_realtime ADD TABLE public.audio_phone_imitations;