
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
    if (normalizedRace.includes('terr')) return 'text-blue-400';
    if (normalizedRace.includes('prot')) return 'text-yellow-300';
    if (normalizedRace.includes('zerg')) return 'text-green-500';
    return '';
  };

  // Handler with proper event handling
  const handleSelectPlayer = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectPlayer(index);
  };

  return (
    <div className="mb-6 sc-metal-frame border-2 border-gray-900">
      <div className="bg-black/80 px-4 py-2 border-b border-gray-800">
        <h3 className="text-sm text-green-400 sc-terminal-text uppercase tracking-wider">Spielerperspektive</h3>
      </div>

      <div className="grid grid-cols-2 gap-px bg-gray-900">
        {/* First player button - StarCraft style */}
        <Button
          variant="ghost"
          className={`group h-auto relative p-0 overflow-hidden rounded-none
            ${selectedPlayerIndex === 0 ? 
              "bg-black/80 border-b-2 border-b-blue-500/60" : 
              "bg-black/40 hover:bg-black/60"}`}
          onClick={handleSelectPlayer(0)}
          type="button"
        >
          {/* StarCraft style active selection indicator */}
          {selectedPlayerIndex === 0 && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
          )}

          {/* Content with StarCraft-style spacing */}
          <div className="w-full p-3 text-left">
            <div className="flex justify-between items-center">
              <div className={`font-bold sc-terminal-text text-lg ${getRaceColor(race1)}`}>
                {player1}
              </div>
              
              <Badge variant="outline" className={`${getRaceColor(race1)} border-current uppercase bg-black/50`}>
                {race1}
              </Badge>
            </div>
            
            <div className="mt-1">
              {selectedPlayerIndex === 0 ? (
                <span className="text-xs text-green-400 font-medium">Aktuelle Perspektive</span>
              ) : (
                <span className="text-xs text-gray-400">Auswählen</span>
              )}
            </div>
          </div>
        </Button>

        {/* Second player button - StarCraft style */}
        <Button
          variant="ghost"
          className={`group h-auto relative p-0 overflow-hidden rounded-none
            ${selectedPlayerIndex === 1 ? 
              "bg-black/80 border-b-2 border-b-blue-500/60" : 
              "bg-black/40 hover:bg-black/60"}`}
          onClick={handleSelectPlayer(1)}
          type="button"
        >
          {/* StarCraft style active selection indicator */}
          {selectedPlayerIndex === 1 && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
          )}

          {/* Content with StarCraft-style spacing */}
          <div className="w-full p-3 text-left">
            <div className="flex justify-between items-center">
              <div className={`font-bold sc-terminal-text text-lg ${getRaceColor(race2)}`}>
                {player2}
              </div>
              
              <Badge variant="outline" className={`${getRaceColor(race2)} border-current uppercase bg-black/50`}>
                {race2}
              </Badge>
            </div>
            
            <div className="mt-1">
              {selectedPlayerIndex === 1 ? (
                <span className="text-xs text-green-400 font-medium">Aktuelle Perspektive</span>
              ) : (
                <span className="text-xs text-gray-400">Auswählen</span>
              )}
            </div>
          </div>
        </Button>
      </div>
    </div>
  );
};

export default PlayerSelector;
