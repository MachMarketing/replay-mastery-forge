
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookUser, Users } from 'lucide-react';

interface PlayerSelectorProps {
  player1: string;
  player2: string;
  race1: string;
  race2: string;
  selectedPlayerIndex: number;
  onSelectPlayer: (index: number) => void;
}

const PlayerSelector: React.FC<PlayerSelectorProps> = ({
  player1,
  player2,
  race1,
  race2,
  selectedPlayerIndex,
  onSelectPlayer
}) => {
  // Helper function to get race-specific color
  const getRaceColor = (race: string): string => {
    const normalizedRace = race.toLowerCase();
    if (normalizedRace.includes('terr')) return 'text-terran';
    if (normalizedRace.includes('prot')) return 'text-protoss';
    if (normalizedRace.includes('zerg')) return 'text-zerg';
    return '';
  };

  return (
    <div className="mb-4">
      <p className="text-sm mb-2 text-muted-foreground">
        <Users className="inline-block w-4 h-4 mr-1" /> 
        Select which player you are to receive personalized coaching:
      </p>

      <div className="grid grid-cols-2 gap-4">
        {/* First player */}
        <Button
          variant={selectedPlayerIndex === 0 ? "default" : "outline"}
          className={`h-auto py-3 px-4 flex flex-col items-start text-left ${
            selectedPlayerIndex === 0 ? "border-2 border-primary" : ""
          }`}
          onClick={() => onSelectPlayer(0)}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <span className={`font-medium text-base ${getRaceColor(race1)}`}>
              {player1}
            </span>
            <Badge variant="secondary" className="ml-2">
              {race1}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground flex items-center">
            <BookUser className="w-3 h-3 mr-1" />
            {selectedPlayerIndex === 0 ? "Viewing your analysis" : "Click to see your analysis"}
          </div>
        </Button>

        {/* Second player */}
        <Button
          variant={selectedPlayerIndex === 1 ? "default" : "outline"}
          className={`h-auto py-3 px-4 flex flex-col items-start text-left ${
            selectedPlayerIndex === 1 ? "border-2 border-primary" : ""
          }`}
          onClick={() => onSelectPlayer(1)}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <span className={`font-medium text-base ${getRaceColor(race2)}`}>
              {player2}
            </span>
            <Badge variant="secondary" className="ml-2">
              {race2}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground flex items-center">
            <BookUser className="w-3 h-3 mr-1" />
            {selectedPlayerIndex === 1 ? "Viewing your analysis" : "Click to see your analysis"}
          </div>
        </Button>
      </div>
    </div>
  );
};

export default PlayerSelector;
