
import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface ReplayFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  raceFilter: string;
  setRaceFilter: (race: string) => void;
  resultFilter: string;
  setResultFilter: (result: string) => void;
}

const ReplayFilters: React.FC<ReplayFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  raceFilter,
  setRaceFilter,
  resultFilter,
  setResultFilter
}) => {
  const hasFilters = searchQuery || raceFilter || resultFilter;
  
  const clearFilters = () => {
    setSearchQuery('');
    setRaceFilter('');
    setResultFilter('');
  };
  
  return (
    <div className="bg-secondary/10 p-4 rounded-lg border border-border mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Search by player name, map or matchup..."
            className="pl-10 bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={raceFilter} onValueChange={setRaceFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-background">
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
            <SelectTrigger className="w-full sm:w-[180px] bg-background">
              <SelectValue placeholder="Filter by result" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All results</SelectItem>
              <SelectItem value="win">Wins</SelectItem>
              <SelectItem value="loss">Losses</SelectItem>
            </SelectContent>
          </Select>
          
          {hasFilters && (
            <Button 
              variant="ghost" 
              className="flex items-center gap-2" 
              onClick={clearFilters}
            >
              <X size={16} />
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReplayFilters;
