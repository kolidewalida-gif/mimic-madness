-- Create quiz_rounds table
CREATE TABLE public.quiz_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lobby_id UUID NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL DEFAULT 1,
  question_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'culture',
  difficulty TEXT NOT NULL DEFAULT 'medium',
  phase TEXT NOT NULL DEFAULT 'countdown',
  started_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quiz_answers table
CREATE TABLE public.quiz_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lobby_id UUID NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL DEFAULT 1,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  answer TEXT NOT NULL,
  answered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  response_time_ms INTEGER NOT NULL DEFAULT 0,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quiz_scores table
CREATE TABLE public.quiz_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lobby_id UUID NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  average_time_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lobby_id, player_id)
);

-- Enable RLS on all tables
ALTER TABLE public.quiz_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_scores ENABLE ROW LEVEL SECURITY;

-- RLS policies for quiz_rounds
CREATE POLICY "Anyone can view quiz rounds" ON public.quiz_rounds FOR SELECT USING (true);
CREATE POLICY "Anyone can insert quiz rounds" ON public.quiz_rounds FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update quiz rounds" ON public.quiz_rounds FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete quiz rounds" ON public.quiz_rounds FOR DELETE USING (true);

-- RLS policies for quiz_answers
CREATE POLICY "Anyone can view quiz answers" ON public.quiz_answers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert quiz answers" ON public.quiz_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update quiz answers" ON public.quiz_answers FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete quiz answers" ON public.quiz_answers FOR DELETE USING (true);

-- RLS policies for quiz_scores
CREATE POLICY "Anyone can view quiz scores" ON public.quiz_scores FOR SELECT USING (true);
CREATE POLICY "Anyone can insert quiz scores" ON public.quiz_scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update quiz scores" ON public.quiz_scores FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete quiz scores" ON public.quiz_scores FOR DELETE USING (true);

-- Enable realtime for quiz tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_scores;