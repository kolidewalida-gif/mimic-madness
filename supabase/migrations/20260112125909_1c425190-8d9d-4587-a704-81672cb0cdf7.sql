-- Create profiles table for authenticated users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create player_stats table for game statistics
CREATE TABLE public.player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  audio_phone_games INTEGER DEFAULT 0,
  quiz_games INTEGER DEFAULT 0,
  standard_games INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  recordings_made INTEGER DEFAULT 0,
  games_hosted INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  total_play_time_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create friendships table
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  addressee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

-- Create friend codes for easy friend adding
CREATE TABLE public.friend_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_codes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Player stats policies
CREATE POLICY "Stats are viewable by everyone" ON public.player_stats FOR SELECT USING (true);
CREATE POLICY "Users can update their own stats" ON public.player_stats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own stats" ON public.player_stats FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Friendships policies
CREATE POLICY "Users can view their own friendships" ON public.friendships FOR SELECT 
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Users can create friend requests" ON public.friendships FOR INSERT 
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update friendships they're part of" ON public.friendships FOR UPDATE 
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Users can delete their own friendships" ON public.friendships FOR DELETE 
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Friend codes policies
CREATE POLICY "Friend codes are viewable by everyone" ON public.friend_codes FOR SELECT USING (true);
CREATE POLICY "Users can create their own friend code" ON public.friend_codes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own friend code" ON public.friend_codes FOR UPDATE USING (auth.uid() = user_id);

-- Function to generate unique friend code
CREATE OR REPLACE FUNCTION public.generate_friend_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := upper(substr(md5(random()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.friend_codes WHERE code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- Trigger to auto-create profile and stats on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Player'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  INSERT INTO public.player_stats (user_id)
  VALUES (NEW.id);
  
  INSERT INTO public.friend_codes (user_id, code)
  VALUES (NEW.id, public.generate_friend_code());
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_player_stats_updated_at BEFORE UPDATE ON public.player_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_friendships_updated_at BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for friendships
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;