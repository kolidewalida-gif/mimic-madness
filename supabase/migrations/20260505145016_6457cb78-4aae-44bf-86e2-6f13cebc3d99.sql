ALTER TABLE public.quiz_rounds 
  ADD COLUMN IF NOT EXISTS total_rounds integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS answer_duration_ms integer NOT NULL DEFAULT 30000,
  ADD COLUMN IF NOT EXISTS difficulty_filter text,
  ADD COLUMN IF NOT EXISTS question_mode text NOT NULL DEFAULT 'mixed';