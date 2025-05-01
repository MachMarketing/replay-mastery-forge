
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookUser, Users, Crown, Check } from 'lucide-react';

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
  
  // Helper function to get race-specific background color
  const getRaceBgColor = (race: string): string => {
    const normalizedRace = race.toLowerCase();
    if (normalizedRace.includes('terr')) return 'bg-terran/10';
    if (normalizedRace.includes('prot')) return 'bg-protoss/10';
    if (normalizedRace.includes('zerg')) return 'bg-zerg/10';
    return '';
  };

  return (
    <div className="mb-4">
      <p className="text-sm mb-2 text-muted-foreground">
        <Users className="inline-block w-4 h-4 mr-1" /> 
        Select which player you are to receive personalized coaching:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* First player */}
        <Button
          variant={selectedPlayerIndex === 0 ? "default" : "outline"}
          className={`h-auto py-3 px-4 flex flex-col items-start text-left transition-all hover:shadow-md ${
            selectedPlayerIndex === 0 ? 
              `border-2 border-primary shadow-md ${getRaceBgColor(race1)}` : 
              "hover:bg-secondary/10"
          }`}
          onClick={() => onSelectPlayer(0)}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <div className="flex items-center">
              <span className={`font-medium text-base ${getRaceColor(race1)}`}>
                {player1}
              </span>
              <Badge variant="secondary" className={`ml-2 ${getRaceColor(race1)}`}>
                {race1}
              </Badge>
            </div>
            {selectedPlayerIndex === 0 && (
              <Check className="w-4 h-4 text-primary ml-2" />
            )}
          </div>
          <div className="text-xs text-muted-foreground flex items-center">
            <BookUser className="w-3 h-3 mr-1" />
            {selectedPlayerIndex === 0 ? 
              <span className="text-primary font-medium">Viewing your analysis</span> : 
              "Click to see your analysis"
            }
          </div>
        </Button>

        {/* Second player */}
        <Button
          variant={selectedPlayerIndex === 1 ? "default" : "outline"}
          className={`h-auto py-3 px-4 flex flex-col items-start text-left transition-all hover:shadow-md ${
            selectedPlayerIndex === 1 ? 
              `border-2 border-primary shadow-md ${getRaceBgColor(race2)}` : 
              "hover:bg-secondary/10"
          }`}
          onClick={() => onSelectPlayer(1)}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <div className="flex items-center">
              <span className={`font-medium text-base ${getRaceColor(race2)}`}>
                {player2}
              </span>
              <Badge variant="secondary" className={`ml-2 ${getRaceColor(race2)}`}>
                {race2}
              </Badge>
            </div>
            {selectedPlayerIndex === 1 && (
              <Check className="w-4 h-4 text-primary ml-2" />
            )}
          </div>
          <div className="text-xs text-muted-foreground flex items-center">
            <BookUser className="w-3 h-3 mr-1" />
            {selectedPlayerIndex === 1 ? 
              <span className="text-primary font-medium">Viewing your analysis</span> : 
              "Click to see your analysis"
            }
          </div>
        </Button>
      </div>
    </div>
  );
};

export default PlayerSelector;
