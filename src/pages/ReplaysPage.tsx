
import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Upload, 
  ChevronRight,
  Clock,
  BarChart,
  Activity
} from 'lucide-react';

interface ReplayItem {
  id: string;
  playerName: string;
  opponentName: string;
  playerRace: 'Terran' | 'Protoss' | 'Zerg';
  opponentRace: 'Terran' | 'Protoss' | 'Zerg';
  map: string;
  matchup: string;
  date: string;
  result: 'win' | 'loss';
  duration: string;
  apm: number;
}

// Sample replay data
const sampleReplays: ReplayItem[] = [
  {
    id: 'rep-001',
    playerName: 'Flash',
    opponentName: 'Jaedong',
    playerRace: 'Terran',
    opponentRace: 'Zerg',
    map: 'Fighting Spirit',
    matchup: 'TvZ',
    date: '2025-04-28',
    result: 'win',
    duration: '15:43',
    apm: 320,
  },
  {
    id: 'rep-002',
    playerName: 'Flash',
    opponentName: 'Bisu',
    playerRace: 'Terran',
    opponentRace: 'Protoss',
    map: 'Circuit Breaker',
    matchup: 'TvP',
    date: '2025-04-25',
    result: 'loss',
    duration: '18:12',
    apm: 315,
  },
  {
    id: 'rep-003',
    playerName: 'Flash',
    opponentName: 'Mind',
    playerRace: 'Terran',
    opponentRace: 'Terran',
    map: 'Jade',
    matchup: 'TvT',
    date: '2025-04-22',
    result: 'win',
    duration: '22:05',
    apm: 305,
  },
  {
    id: 'rep-004',
    playerName: 'Flash',
    opponentName: 'Soulkey',
    playerRace: 'Terran',
    opponentRace: 'Zerg',
    map: 'Heartbreak Ridge',
    matchup: 'TvZ',
    date: '2025-04-20',
    result: 'win',
    duration: '14:18',
    apm: 330,
  },
  {
    id: 'rep-005',
    playerName: 'Flash',
    opponentName: 'Stork',
    playerRace: 'Terran',
    opponentRace: 'Protoss',
    map: 'Destination',
    matchup: 'TvP',
    date: '2025-04-18',
    result: 'loss',
    duration: '19:52',
    apm: 318,
  },
];

const ReplaysPage = () => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [raceFilter, setRaceFilter] = React.useState('');
  const [resultFilter, setResultFilter] = React.useState('');
  
  // Apply filters to replays
  const filteredReplays = sampleReplays.filter(replay => {
    // Search query filter (case insensitive)
    const query = searchQuery.toLowerCase();
    if (
      query && 
      !replay.playerName.toLowerCase().includes(query) &&
      !replay.opponentName.toLowerCase().includes(query) &&
      !replay.map.toLowerCase().includes(query) &&
      !replay.matchup.toLowerCase().includes(query)
    ) {
      return false;
    }
    
    // Race filter
    if (raceFilter && replay.matchup.indexOf(raceFilter) === -1) {
      return false;
    }
    
    // Result filter
    if (resultFilter && replay.result !== resultFilter) {
      return false;
    }
    
    return true;
  });
  
  // Helper function to get race-specific color
  const getRaceColor = (race: 'Terran' | 'Protoss' | 'Zerg'): string => {
    switch (race) {
      case 'Terran':
        return 'text-terran';
      case 'Protoss':
        return 'text-protoss';
      case 'Zerg':
        return 'text-zerg';
      default:
        return '';
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar isLoggedIn={true} username="Player123" />
      
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
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Search replays..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <Select value={raceFilter} onValueChange={setRaceFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by race" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All matchups</SelectItem>
                  <SelectItem value="T">Terran</SelectItem>
                  <SelectItem value="P">Protoss</SelectItem>
                  <SelectItem value="Z">Zerg</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={resultFilter} onValueChange={setResultFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by result" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All results</SelectItem>
                  <SelectItem value="win">Wins</SelectItem>
                  <SelectItem value="loss">Losses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Replays list */}
          <div className="space-y-4">
            {filteredReplays.length > 0 ? (
              filteredReplays.map((replay) => (
                <Link 
                  key={replay.id} 
                  to={`/analysis/${replay.id}`}
                  className="block bg-card rounded-lg border border-border p-4 hover:border-primary transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`font-medium ${getRaceColor(replay.playerRace)}`}>
                          {replay.playerName}
                        </span>
                        <span className="text-sm text-muted-foreground">vs.</span>
                        <span className={`font-medium ${getRaceColor(replay.opponentRace)}`}>
                          {replay.opponentName}
                        </span>
                        <Badge variant={replay.result === 'win' ? 'default' : 'destructive'} className="ml-2">
                          {replay.result.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {replay.matchup} on {replay.map} • {replay.date}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-sm">
                        <Clock size={16} className="text-muted-foreground" />
                        <span>{replay.duration}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Activity size={16} className="text-muted-foreground" />
                        <span>{replay.apm} APM</span>
                      </div>
                      <ChevronRight size={18} className="text-muted-foreground hidden md:block" />
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-12 bg-secondary/20 rounded-lg border border-border">
                <p className="text-xl font-medium mb-2">No replays found</p>
                <p className="text-muted-foreground mb-6">
                  {searchQuery || raceFilter || resultFilter
                    ? 'Try adjusting your filters or search query'
                    : 'Upload your first replay to get started'}
                </p>
                {!searchQuery && !raceFilter && !resultFilter && (
                  <Button asChild>
                    <Link to="/upload" className="flex items-center gap-2">
                      <Upload size={18} />
                      Upload New Replay
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
          
          {/* Pagination */}
          {filteredReplays.length > 0 && (
            <div className="flex justify-center mt-8">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled>Previous</Button>
                <Button size="sm" variant="outline" className="bg-primary/10">1</Button>
                <Button size="sm" variant="outline">2</Button>
                <Button size="sm" variant="outline">3</Button>
                <Button variant="outline" size="sm">Next</Button>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ReplaysPage;
