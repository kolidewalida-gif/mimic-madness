-- Add options column to quiz_rounds for storing QCM options
ALTER TABLE public.quiz_rounds 
ADD COLUMN IF NOT EXISTS options text[] DEFAULT NULL;

-- Add question_type column (qcm or text)
ALTER TABLE public.quiz_rounds 
ADD COLUMN IF NOT EXISTS question_type text DEFAULT 'qcm';