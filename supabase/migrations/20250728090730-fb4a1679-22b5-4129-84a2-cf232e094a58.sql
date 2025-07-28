-- Create replays table for storing parsed replay data
CREATE TABLE public.replays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  map_name TEXT,
  game_length TEXT,
  matchup TEXT,
  winner_id INTEGER,
  parser_used TEXT, -- 'go-service', 'screp-js', 'native'
  analysis_data JSONB, -- Complete analysis results
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.replays ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own replays" 
ON public.replays 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own replays" 
ON public.replays 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own replays" 
ON public.replays 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own replays" 
ON public.replays 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create profiles table for additional user info
CREATE TABLE public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  username TEXT,
  avatar_url TEXT,
  skill_rating INTEGER DEFAULT 1000,
  favorite_race TEXT,
  total_replays INTEGER DEFAULT 0,
  avg_apm DECIMAL DEFAULT 0,
  avg_eapm DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_replays_user_id ON public.replays(user_id);
CREATE INDEX idx_replays_upload_date ON public.replays(upload_date DESC);
CREATE INDEX idx_replays_map_name ON public.replays(map_name);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_replays_updated_at
  BEFORE UPDATE ON public.replays
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();