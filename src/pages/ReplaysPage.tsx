
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Upload, Filter, RefreshCw } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ReplayCard from '@/components/replays/ReplayCard';
import ReplayFilters from '@/components/replays/ReplayFilters';
import EmptyReplaysState from '@/components/replays/EmptyReplaysState';
import ReplaysPagination from '@/components/replays/ReplaysPagination';
import { useReplays } from '@/hooks/useReplays';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const ITEMS_PER_PAGE = 10;

const ReplaysPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [raceFilter, setRaceFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
  const { replays, isLoading, error, fetchReplays, filterReplays } = useReplays();
  
  useEffect(() => {
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [searchQuery, raceFilter, resultFilter]);
  
  const handleRefresh = () => {
    fetchReplays();
    toast.success('Refreshing replays list');
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };
  
  // Apply filters
  const filteredReplays = filterReplays(searchQuery, raceFilter === 'all' ? '' : raceFilter, resultFilter === 'all' ? '' : resultFilter);
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredReplays.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedReplays = filteredReplays.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Check if filters are active
  const isFiltered = searchQuery !== '' || raceFilter !== 'all' || resultFilter !== 'all';
  
  // Calculate stats
  const totalReplays = replays.length;
  const wins = replays.filter(replay => replay.result === 'win').length;
  const winRate = totalReplays > 0 ? Math.round((wins / totalReplays) * 100) : 0;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      
      <main className="flex-1 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">My Replays</h1>
              {!isLoading && totalReplays > 0 && (
                <p className="text-muted-foreground mt-1">
                  {totalReplays} {totalReplays === 1 ? 'replay' : 'replays'} • Win rate: {winRate}%
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 self-end md:self-auto">
              <Button variant="outline" size="icon" onClick={handleRefresh} className="h-10 w-10">
                <RefreshCw size={18} className="text-muted-foreground" />
              </Button>
              <Button variant="outline" size="icon" onClick={toggleFilters} className={`h-10 w-10 md:hidden ${showFilters ? 'bg-secondary/50' : ''}`}>
                <Filter size={18} className="text-muted-foreground" />
              </Button>
              <Button asChild>
                <Link to="/upload" className="flex items-center gap-2">
                  <Upload size={18} />
                  Upload New Replay
                </Link>
              </Button>
            </div>
          </div>
          
          {/* Filters - always visible on md screens, toggleable on mobile */}
          <div className={`md:block ${showFilters ? 'block' : 'hidden'}`}>
            <ReplayFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              raceFilter={raceFilter}
              setRaceFilter={setRaceFilter}
              resultFilter={resultFilter}
              setResultFilter={setResultFilter}
            />
          </div>
          
          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4 mt-8">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-5 w-16 rounded-full ml-2" />
                      </div>
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-4 rounded-full" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          
          {/* Error State */}
          {error && (
            <div className="text-center py-12 bg-destructive/10 rounded-lg border border-destructive/30 mt-8">
              <p className="text-xl font-medium mb-2 text-destructive">Error loading replays</p>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw size={18} className="mr-2" />
                Try Again
              </Button>
            </div>
          )}
          
          {/* Replays List */}
          {!isLoading && !error && (
            <div className="space-y-4 mt-4">
              {paginatedReplays.length > 0 ? (
                <>
                  {paginatedReplays.map((replay) => (
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
                  ))}
                  
                  {/* Pagination */}
                  {filteredReplays.length > ITEMS_PER_PAGE && (
                    <ReplaysPagination 
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  )}
                </>
              ) : (
                <EmptyReplaysState isFiltered={isFiltered} onClearFilters={() => {
                  setSearchQuery('');
                  setRaceFilter('');
                  setResultFilter('');
                }} />
              )}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ReplaysPage;
