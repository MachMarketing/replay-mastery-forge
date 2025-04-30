
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ReplayCard from '@/components/replays/ReplayCard';
import ReplayFilters from '@/components/replays/ReplayFilters';
import EmptyReplaysState from '@/components/replays/EmptyReplaysState';
import ReplaysPagination from '@/components/replays/ReplaysPagination';
import { useReplays } from '@/hooks/useReplays';
import { useAuth } from '@/context/AuthContext';

const ITEMS_PER_PAGE = 10;

const ReplaysPage = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [raceFilter, setRaceFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const { replays, isLoading, error, filterReplays } = useReplays();
  
  // Apply filters
  const filteredReplays = filterReplays(searchQuery, raceFilter, resultFilter);
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredReplays.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedReplays = filteredReplays.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Check if filters are active
  const isFiltered = searchQuery !== '' || raceFilter !== '' || resultFilter !== '';

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar isLoggedIn={!!user} />
      
      <main className="flex-1 py-16 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">My Replays</h1>
            <Button asChild>
              <Link to="/upload" className="flex items-center gap-2">
                <Upload size={18} />
                Upload New Replay
              </Link>
            </Button>
          </div>
          
          {/* Filters */}
          <ReplayFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            raceFilter={raceFilter}
            setRaceFilter={setRaceFilter}
            resultFilter={resultFilter}
            setResultFilter={setResultFilter}
          />
          
          {/* Replays List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">Loading replays...</div>
            ) : error ? (
              <div className="text-center py-12 text-destructive">
                Error loading replays: {error}
              </div>
            ) : paginatedReplays.length > 0 ? (
              paginatedReplays.map((replay) => (
                <ReplayCard
                  key={replay.id}
                  id={replay.id}
                  playerName={replay.player_name || ''}
                  opponentName={replay.opponent_name || ''}
                  playerRace={replay.player_race || ''}
                  opponentRace={replay.opponent_race || ''}
                  map={replay.map || ''}
                  matchup={replay.matchup || ''}
                  date={replay.date || replay.created_at || ''}
                  result={replay.result || ''}
                  duration={replay.duration || ''}
                  apm={replay.apm}
                />
              ))
            ) : (
              <EmptyReplaysState isFiltered={isFiltered} />
            )}
          </div>
          
          {/* Pagination */}
          {filteredReplays.length > 0 && (
            <ReplaysPagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ReplaysPage;
