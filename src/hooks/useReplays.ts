
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Replay {
  id: string;
  filename: string;
  original_filename: string;
  player_name: string | null;
  opponent_name: string | null;
  player_race: string | null;
  opponent_race: string | null;
  map: string | null;
  duration: string | null;
  date: string | null;
  result: string | null;
  apm: number | null;
  eapm: number | null;
  matchup: string | null;
  created_at: string;
  user_id: string;
}

export function useReplays() {
  const [replays, setReplays] = useState<Replay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReplays = useCallback(async () => {
    // Prevent multiple concurrent fetches
    if (isLoading) {
      console.log('Already fetching replays, skipping...');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No authenticated user found');
        setReplays([]);
        return;
      }

      console.log('Fetching replays for user:', user.id);

      const { data, error: fetchError } = await supabase
        .from('replays')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching replays:', fetchError);
        setError(fetchError.message);
        return;
      }

      console.log('Fetched replays:', data?.length || 0);
      setReplays(data || []);
    } catch (err) {
      console.error('Unexpected error fetching replays:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []); // Remove isLoading from dependencies to prevent infinite loops

  // Filter replays function
  const filterReplays = useCallback((filters: {
    race?: string;
    matchup?: string;
    result?: string;
    dateRange?: string;
  }) => {
    return replays.filter(replay => {
      if (filters.race && replay.player_race !== filters.race) {
        return false;
      }
      if (filters.matchup && replay.matchup !== filters.matchup) {
        return false;
      }
      if (filters.result && replay.result !== filters.result) {
        return false;
      }
      if (filters.dateRange) {
        const replayDate = new Date(replay.created_at);
        const now = new Date();
        
        switch (filters.dateRange) {
          case 'today':
            return replayDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return replayDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return replayDate >= monthAgo;
          default:
            return true;
        }
      }
      return true;
    });
  }, [replays]);

  // Only fetch on mount, not on every render
  useEffect(() => {
    let mounted = true;
    
    const initFetch = async () => {
      if (mounted) {
        await fetchReplays();
      }
    };
    
    initFetch();
    
    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array to only run on mount

  return {
    replays,
    isLoading,
    error,
    fetchReplays,
    filterReplays
  };
}
