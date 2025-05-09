
import React from 'react';
import { Button } from "@/components/ui/button";
import { User } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export interface PlayerSelectorProps {
  player1: {
    name: string;
    race: string;
    apm: number;
  };
  player2: {
    name: string;
    race: string;
    apm: number;
  };
  selectedPlayerIndex: number;
  onPlayerSelect: (playerIndex: number) => void;
}

const PlayerSelector: React.FC<PlayerSelectorProps> = ({
  player1,
  player2,
  selectedPlayerIndex,
  onPlayerSelect
}) => {
  return (
    <div className="flex space-x-2">
      <Button
        variant={selectedPlayerIndex === 0 ? "default" : "outline"}
        size="sm"
        onClick={() => onPlayerSelect(0)}
        className="flex items-center"
      >
        <User size={14} className="mr-1" />
        <span className="truncate max-w-[100px]">{player1.name}</span>
        <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0">
          {player1.race.charAt(0)}
        </Badge>
      </Button>
      
      <Button
        variant={selectedPlayerIndex === 1 ? "default" : "outline"}
        size="sm"
        onClick={() => onPlayerSelect(1)}
        className="flex items-center"
      >
        <User size={14} className="mr-1" />
        <span className="truncate max-w-[100px]">{player2.name}</span>
        <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0">
          {player2.race.charAt(0)}
        </Badge>
      </Button>
    </div>
  );
};

export default PlayerSelector;
