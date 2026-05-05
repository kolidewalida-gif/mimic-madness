-- Add XP and level columns to player_stats table
ALTER TABLE public.player_stats
ADD COLUMN IF NOT EXISTS current_xp integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_xp integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS level integer DEFAULT 1;

-- Create player_rewards table to track unlockable rewards
CREATE TABLE IF NOT EXISTS public.player_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  reward_id text NOT NULL,
  unlocked_at timestamp with time zone NOT NULL DEFAULT now(),
  is_equipped boolean DEFAULT false,
  UNIQUE(user_id, reward_id)
);

-- Create player_achievements table for persistent achievement tracking
CREATE TABLE IF NOT EXISTS public.player_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  achievement_id text NOT NULL,
  unlocked_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS on new tables
ALTER TABLE public.player_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;

-- RLS policies for player_rewards
CREATE POLICY "Users can view all rewards" ON public.player_rewards
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own rewards" ON public.player_rewards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rewards" ON public.player_rewards
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for player_achievements  
CREATE POLICY "Users can view all achievements" ON public.player_achievements
  FOR SELECT USING (true);

CREATE POLICY "Users can unlock achievements" ON public.player_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_rewards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_achievements;