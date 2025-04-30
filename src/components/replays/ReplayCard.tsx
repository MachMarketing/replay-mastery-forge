
import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Clock, Activity, ChevronRight, MapPin, Calendar } from 'lucide-react';

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

const getRaceEmoji = (race: string): string => {
  switch (race?.toLowerCase()) {
    case 'terran':
      return '🔧'; // Terran - mechanical
    case 'protoss':
      return '🛡️'; // Protoss - shields
    case 'zerg':
      return '🦠'; // Zerg - organic
    default:
      return '';
  }
};

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch (e) {
    return 'Unknown date';
  }
};

const ReplayCard: React.FC<ReplayCardProps> = ({
  id, playerName, opponentName, playerRace, opponentRace, 
  map, matchup, date, result, duration, apm
}) => {
  const formattedDate = formatDate(date);
  
  return (
    <Card className="overflow-hidden hover:border-primary/50 transition-all duration-300 group">
      <Link 
        to={`/analysis/${id}`}
        className="block p-4"
      >
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <div className={`font-semibold ${getRaceColor(playerRace)}`}>
                <span className="mr-1">{getRaceEmoji(playerRace)}</span>
                {playerName || 'Unknown'}
              </div>
              <span className="text-sm text-muted-foreground">vs.</span>
              <div className={`font-semibold ${getRaceColor(opponentRace)}`}>
                <span className="mr-1">{getRaceEmoji(opponentRace)}</span>
                {opponentName || 'Unknown'}
              </div>
              <Badge variant={result === 'win' ? 'default' : 'destructive'} className="ml-auto md:ml-2">
                {result === 'win' ? 'VICTORY' : 'DEFEAT'}
              </Badge>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-y-1 sm:gap-x-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar size={14} className="flex-shrink-0" />
                <span>{formattedDate}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <MapPin size={14} className="flex-shrink-0" />
                <span>{map || 'Unknown Map'}</span>
              </div>
              
              {matchup && (
                <div className="font-mono bg-secondary/30 px-2 py-0.5 rounded text-xs">
                  {matchup}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4 border-t pt-3 mt-2 md:border-t-0 md:pt-0 md:mt-0">
            {duration && (
              <div className="flex items-center gap-1 text-sm">
                <Clock size={16} className="text-muted-foreground" />
                <span>{duration}</span>
              </div>
            )}
            {apm && (
              <div className="flex items-center gap-1 text-sm">
                <Activity size={16} className="text-muted-foreground" />
                <span><span className="font-semibold">{apm}</span> APM</span>
              </div>
            )}
            <ChevronRight size={18} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity ml-2 transform group-hover:translate-x-1 transition-transform duration-300" />
          </div>
        </div>
      </Link>
    </Card>
  );
};

export default ReplayCard;
