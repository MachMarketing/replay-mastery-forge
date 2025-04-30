
import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  return (
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
  );
};

export default ReplayFilters;
