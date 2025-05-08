
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Gamepad2 } from 'lucide-react';

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
    if (normalizedRace.includes('terr')) return 'text-terran border-terran/50';
    if (normalizedRace.includes('prot')) return 'text-protoss border-protoss/50';
    if (normalizedRace.includes('zerg')) return 'text-zerg border-zerg/50';
    return '';
  };

  // Helper function to get race-specific glow color
  const getRaceGlowColor = (race: string, isSelected: boolean): string => {
    if (!isSelected) return '';
    
    const normalizedRace = race.toLowerCase();
    if (normalizedRace.includes('terr')) return 'shadow-[0_0_8px_rgba(37,99,235,0.7)]';
    if (normalizedRace.includes('prot')) return 'shadow-[0_0_8px_rgba(245,158,11,0.7)]';
    if (normalizedRace.includes('zerg')) return 'shadow-[0_0_8px_rgba(126,34,206,0.7)]';
    return '';
  };

  // Handler with proper event handling
  const handleSelectPlayer = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectPlayer(index);
  };

  return (
    <div className="mb-6 sc-metal-frame">
      <div className="bg-gradient-to-r from-black/80 via-gray-900/90 to-black/80 px-4 py-2 border-b border-gray-800 flex items-center">
        <div className="w-5 h-5 mr-2 flex-shrink-0 bg-primary/10 rounded-full flex items-center justify-center">
          <Gamepad2 className="w-3 h-3 text-green-400" />
        </div>
        <h3 className="text-sm text-green-400 sc-terminal-text uppercase tracking-wider">Spielerperspektive</h3>
      </div>

      <div className="grid grid-cols-2 gap-px bg-gray-900">
        {/* First player button - Enhanced StarCraft style */}
        <Button
          variant="ghost"
          className={`group relative h-auto py-3 px-4 rounded-none overflow-hidden transition-all duration-300
            ${selectedPlayerIndex === 0 ? 
              `bg-gradient-to-b from-gray-900/95 to-black/95 border-b-2 border-b-blue-500/60 ${getRaceGlowColor(race1, true)}` : 
              "bg-black/60 hover:bg-black/80"}`}
          onClick={handleSelectPlayer(0)}
          type="button"
        >
          {/* Visual indicator for selection - active state */}
          {selectedPlayerIndex === 0 && (
            <>
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400/80 via-blue-500/60 to-blue-400/80"></div>
              <div className="absolute -bottom-[1px] left-0 right-0 h-[2px]">
                <div className="w-full h-full bg-gradient-to-r from-transparent via-blue-500/80 to-transparent"></div>
              </div>
              <div className="absolute left-0 top-0 right-0 bottom-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-60"></div>
                <div className="absolute inset-0 opacity-20 radar-scan"></div>
              </div>
            </>
          )}

          {/* Main content with clearer visual hierarchy */}
          <div className="w-full flex flex-col items-start">
            {/* Race badge */}
            <Badge 
              variant="outline" 
              className={`${getRaceColor(race1)} border mb-1.5 uppercase bg-black/50 text-xs px-1.5 py-0.5`}
            >
              {race1}
            </Badge>
            
            {/* Player name with race-specific color */}
            <div className={`font-bold sc-terminal-text text-xl ${selectedPlayerIndex === 0 ? getRaceColor(race1).split(' ')[0] : 'text-gray-400'}`}>
              {player1}
            </div>
            
            {/* Status indicator */}
            <div className="mt-1.5 flex items-center">
              {selectedPlayerIndex === 0 ? (
                <>
                  <span className="bg-green-500/20 border border-green-500/30 text-green-400 text-xs rounded px-1.5 py-0.5 flex items-center gap-1 animate-pulse">
                    <Check className="w-3 h-3" />
                    <span className="font-medium">Aktuelle Perspektive</span>
                  </span>
                </>
              ) : (
                <span className="text-xs text-gray-500 hover:text-gray-400 transition-colors">Auswählen</span>
              )}
            </div>
          </div>
        </Button>

        {/* Second player button - Enhanced StarCraft style */}
        <Button
          variant="ghost"
          className={`group relative h-auto py-3 px-4 rounded-none overflow-hidden transition-all duration-300
            ${selectedPlayerIndex === 1 ? 
              `bg-gradient-to-b from-gray-900/95 to-black/95 border-b-2 border-b-blue-500/60 ${getRaceGlowColor(race2, true)}` : 
              "bg-black/60 hover:bg-black/80"}`}
          onClick={handleSelectPlayer(1)}
          type="button"
        >
          {/* Visual indicator for selection - active state */}
          {selectedPlayerIndex === 1 && (
            <>
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400/80 via-blue-500/60 to-blue-400/80"></div>
              <div className="absolute -bottom-[1px] left-0 right-0 h-[2px]">
                <div className="w-full h-full bg-gradient-to-r from-transparent via-blue-500/80 to-transparent"></div>
              </div>
              <div className="absolute left-0 top-0 right-0 bottom-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-60"></div>
                <div className="absolute inset-0 opacity-20 radar-scan"></div>
              </div>
            </>
          )}

          {/* Main content with clearer visual hierarchy */}
          <div className="w-full flex flex-col items-start">
            {/* Race badge */}
            <Badge 
              variant="outline" 
              className={`${getRaceColor(race2)} border mb-1.5 uppercase bg-black/50 text-xs px-1.5 py-0.5`}
            >
              {race2}
            </Badge>
            
            {/* Player name with race-specific color */}
            <div className={`font-bold sc-terminal-text text-xl ${selectedPlayerIndex === 1 ? getRaceColor(race2).split(' ')[0] : 'text-gray-400'}`}>
              {player2}
            </div>
            
            {/* Status indicator */}
            <div className="mt-1.5 flex items-center">
              {selectedPlayerIndex === 1 ? (
                <>
                  <span className="bg-green-500/20 border border-green-500/30 text-green-400 text-xs rounded px-1.5 py-0.5 flex items-center gap-1 animate-pulse">
                    <Check className="w-3 h-3" />
                    <span className="font-medium">Aktuelle Perspektive</span>
                  </span>
                </>
              ) : (
                <span className="text-xs text-gray-500 hover:text-gray-400 transition-colors">Auswählen</span>
              )}
            </div>
          </div>
        </Button>
      </div>
    </div>
  );
};

export default PlayerSelector;
