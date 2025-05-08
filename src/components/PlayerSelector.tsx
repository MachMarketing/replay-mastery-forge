
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

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
    if (normalizedRace.includes('terr')) return 'bg-terran/5';
    if (normalizedRace.includes('prot')) return 'bg-protoss/5';
    if (normalizedRace.includes('zerg')) return 'bg-zerg/5';
    return '';
  };
  
  // Helper function to get race-specific border color
  const getRaceBorderColor = (race: string): string => {
    const normalizedRace = race.toLowerCase();
    if (normalizedRace.includes('terr')) return 'border-terran/30';
    if (normalizedRace.includes('prot')) return 'border-protoss/30';
    if (normalizedRace.includes('zerg')) return 'border-zerg/30';
    return 'border-primary/30';
  };

  // Handler with proper event handling
  const handleSelectPlayer = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectPlayer(index);
    console.log(`Selected player ${index + 1}`);
  };

  return (
    <div className="mb-6 relative">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -z-10"></div>
      
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground flex items-center">
          <Users className="inline-block w-4 h-4 mr-1" /> 
          <span>Wähle deine Perspektive für die Analyse:</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* First player card - Clean Blizzard-inspired design */}
        <Button
          variant="ghost"
          className={`h-auto relative flex items-start text-left transition-all duration-300 p-0 overflow-hidden
            ${selectedPlayerIndex === 0 ? 
              `border-2 ${getRaceBorderColor(race1)} sc-panel` : 
              "border border-border/40 hover:bg-secondary/10"}
            rounded-lg`}
          onClick={handleSelectPlayer(0)}
          type="button"
        >
          {/* Background subtle gradient */}
          <div className={`absolute inset-0 ${getRaceBgColor(race1)} opacity-30 -z-10`}></div>
          
          {/* Clean selection indicator - subtle scan line when selected */}
          {selectedPlayerIndex === 0 && (
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent 
                animate-[scan_3s_ease-in-out_infinite] opacity-40"></div>
            </div>
          )}

          {/* Content with better spacing */}
          <div className="w-full p-4">
            <div className="flex flex-col space-y-1">
              <div className="flex items-center justify-between w-full">
                <div className={`font-bold sc-terminal-text text-lg tracking-wide ${getRaceColor(race1)}`}>
                  {player1}
                </div>
                
                <Badge variant="outline" className={`${getRaceColor(race1)} border-current font-medium`}>
                  {race1}
                </Badge>
              </div>
              
              <div className={`text-sm ${selectedPlayerIndex === 0 ? "text-foreground" : "text-muted-foreground"}`}>
                {selectedPlayerIndex === 0 ? (
                  <span className="font-medium">Aktuelle Perspektive</span>
                ) : (
                  <span>Klicken um zu dieser Perspektive zu wechseln</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Bottom border glow effect - subtle */}
          {selectedPlayerIndex === 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r 
              from-transparent via-primary/80 to-transparent"></div>
          )}
        </Button>

        {/* Second player card - Clean Blizzard-inspired design */}
        <Button
          variant="ghost"
          className={`h-auto relative flex items-start text-left transition-all duration-300 p-0 overflow-hidden
            ${selectedPlayerIndex === 1 ? 
              `border-2 ${getRaceBorderColor(race2)} sc-panel` : 
              "border border-border/40 hover:bg-secondary/10"}
            rounded-lg`}
          onClick={handleSelectPlayer(1)}
          type="button"
        >
          {/* Background subtle gradient */}
          <div className={`absolute inset-0 ${getRaceBgColor(race2)} opacity-30 -z-10`}></div>
          
          {/* Clean selection indicator - subtle scan line when selected */}
          {selectedPlayerIndex === 1 && (
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent 
                animate-[scan_3s_ease-in-out_infinite] opacity-40"></div>
            </div>
          )}

          {/* Content with better spacing */}
          <div className="w-full p-4">
            <div className="flex flex-col space-y-1">
              <div className="flex items-center justify-between w-full">
                <div className={`font-bold sc-terminal-text text-lg tracking-wide ${getRaceColor(race2)}`}>
                  {player2}
                </div>
                
                <Badge variant="outline" className={`${getRaceColor(race2)} border-current font-medium`}>
                  {race2}
                </Badge>
              </div>
              
              <div className={`text-sm ${selectedPlayerIndex === 1 ? "text-foreground" : "text-muted-foreground"}`}>
                {selectedPlayerIndex === 1 ? (
                  <span className="font-medium">Aktuelle Perspektive</span>
                ) : (
                  <span>Klicken um zu dieser Perspektive zu wechseln</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Bottom border glow effect - subtle */}
          {selectedPlayerIndex === 1 && (
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r 
              from-transparent via-primary/80 to-transparent"></div>
          )}
        </Button>
      </div>
      
      {/* Add subtle StarCraft-inspired decorative element */}
      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-border/50 to-transparent mt-2"></div>
    </div>
  );
};

export default PlayerSelector;
