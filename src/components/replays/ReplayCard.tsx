
import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Clock, Activity, ChevronRight } from 'lucide-react';

interface ReplayCardProps {
  id: string;
  playerName: string;
  opponentName: string;
  playerRace: string;
  opponentRace: string;
  map: string;
  matchup: string;
  date: string;
  result: string;
  duration: string;
  apm: number | null;
}

const getRaceColor = (race: string): string => {
  switch (race?.toLowerCase()) {
    case 'terran':
      return 'text-terran';
    case 'protoss':
      return 'text-protoss';
    case 'zerg':
      return 'text-zerg';
    default:
      return '';
  }
};

const ReplayCard: React.FC<ReplayCardProps> = ({
  id, playerName, opponentName, playerRace, opponentRace, 
  map, matchup, date, result, duration, apm
}) => {
  const formattedDate = new Date(date).toLocaleDateString();
  
  return (
    <Link 
      to={`/analysis/${id}`}
      className="block bg-card rounded-lg border border-border p-4 hover:border-primary transition-colors"
    >
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`font-medium ${getRaceColor(playerRace)}`}>
              {playerName || 'Unknown'}
            </span>
            <span className="text-sm text-muted-foreground">vs.</span>
            <span className={`font-medium ${getRaceColor(opponentRace)}`}>
              {opponentName || 'Unknown'}
            </span>
            <Badge variant={result === 'win' ? 'default' : 'destructive'} className="ml-2">
              {result?.toUpperCase() || 'UNKNOWN'}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {matchup || '?v?'} on {map || 'Unknown Map'} • {formattedDate}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {duration && (
            <div className="flex items-center gap-1 text-sm">
              <Clock size={16} className="text-muted-foreground" />
              <span>{duration}</span>
            </div>
          )}
          {apm && (
            <div className="flex items-center gap-1 text-sm">
              <Activity size={16} className="text-muted-foreground" />
              <span>{apm} APM</span>
            </div>
          )}
          <ChevronRight size={18} className="text-muted-foreground hidden md:block" />
        </div>
      </div>
    </Link>
  );
};

export default ReplayCard;
