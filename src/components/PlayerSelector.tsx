
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookUser, Users, Crown, Check, Swords, Shield, Activity, Sparkles, Award, Trophy } from 'lucide-react';

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

  // Helper function to get race-specific icon
  const getRaceIcon = (race: string) => {
    const normalizedRace = race.toLowerCase();
    if (normalizedRace.includes('terr')) return '🔧'; // Terran
    if (normalizedRace.includes('prot')) return '🛡️'; // Protoss
    if (normalizedRace.includes('zerg')) return '🦠'; // Zerg
    return '👾'; // Default
  };

  // Handlers with proper event handling
  const handleSelectPlayer1 = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectPlayer(0);
    console.log("Selected player 1");
  };

  const handleSelectPlayer2 = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectPlayer(1);
    console.log("Selected player 2");
  };

  return (
    <div className="mb-4">
      <p className="text-sm mb-3 text-muted-foreground flex items-center">
        <Users className="inline-block w-4 h-4 mr-1" /> 
        Select which player you are to receive personalized coaching:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* First player card */}
        <Button
          variant="ghost"
          className={`h-auto py-3 px-4 relative flex flex-col items-start text-left transition-all ${
            selectedPlayerIndex === 0 ? 
              `border-2 border-primary shadow-md ${getRaceBgColor(race1)}` : 
              "hover:bg-secondary/10 border border-border/60"
          } rounded-lg overflow-hidden group`}
          onClick={handleSelectPlayer1}
          type="button"
        >
          {/* Selection indicator */}
          {selectedPlayerIndex === 0 && (
            <div className="absolute -right-12 -top-12 w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center transform rotate-12 animate-pulse">
              <Check className="w-5 h-5 text-primary absolute bottom-5 right-5" />
            </div>
          )}

          <div className="flex items-center justify-between w-full mb-3 relative z-10">
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center rounded-full w-8 h-8 ${getRaceBgColor(race1)} ${getRaceColor(race1)} text-lg font-bold`}>
                {getRaceIcon(race1)}
              </div>
              <div>
                <span className={`font-medium text-base ${getRaceColor(race1)}`}>
                  {player1}
                </span>
                <Badge variant="outline" className={`ml-2 ${getRaceColor(race1)} border-current`}>
                  {race1}
                </Badge>
              </div>
            </div>
            
            {selectedPlayerIndex === 0 ? (
              <Trophy className="w-5 h-5 text-primary animate-fade-in" />
            ) : (
              <Swords className="w-5 h-5 text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
          
          <div className="w-full">
            <div className={`text-sm flex items-center transition-all gap-1 ${
              selectedPlayerIndex === 0 ? "text-foreground" : "text-muted-foreground"
            }`}>
              {selectedPlayerIndex === 0 ? (
                <>
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="font-medium">Currently viewing your analysis</span>
                </>
              ) : (
                <>
                  <BookUser className="w-3 h-3" />
                  <span>Switch to see your perspective</span>
                </>
              )}
            </div>
            
            {selectedPlayerIndex === 0 && (
              <div className="mt-3 pt-3 border-t border-border/40 w-full flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Activity className="w-3 h-3" />
                  <span>Your actions analyzed</span>
                </div>
                <div className="flex items-center gap-1">
                  <Award className="w-3 h-3 text-primary" />
                  <span className="text-xs font-medium text-primary">Primary player</span>
                </div>
              </div>
            )}
          </div>
        </Button>

        {/* Second player card */}
        <Button
          variant="ghost"
          className={`h-auto py-3 px-4 relative flex flex-col items-start text-left transition-all ${
            selectedPlayerIndex === 1 ? 
              `border-2 border-primary shadow-md ${getRaceBgColor(race2)}` : 
              "hover:bg-secondary/10 border border-border/60"
          } rounded-lg overflow-hidden group`}
          onClick={handleSelectPlayer2}
          type="button"
        >
          {/* Selection indicator */}
          {selectedPlayerIndex === 1 && (
            <div className="absolute -right-12 -top-12 w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center transform rotate-12 animate-pulse">
              <Check className="w-5 h-5 text-primary absolute bottom-5 right-5" />
            </div>
          )}

          <div className="flex items-center justify-between w-full mb-3 relative z-10">
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center rounded-full w-8 h-8 ${getRaceBgColor(race2)} ${getRaceColor(race2)} text-lg font-bold`}>
                {getRaceIcon(race2)}
              </div>
              <div>
                <span className={`font-medium text-base ${getRaceColor(race2)}`}>
                  {player2}
                </span>
                <Badge variant="outline" className={`ml-2 ${getRaceColor(race2)} border-current`}>
                  {race2}
                </Badge>
              </div>
            </div>
            
            {selectedPlayerIndex === 1 ? (
              <Trophy className="w-5 h-5 text-primary animate-fade-in" />
            ) : (
              <Shield className="w-5 h-5 text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
          
          <div className="w-full">
            <div className={`text-sm flex items-center transition-all gap-1 ${
              selectedPlayerIndex === 1 ? "text-foreground" : "text-muted-foreground"
            }`}>
              {selectedPlayerIndex === 1 ? (
                <>
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="font-medium">Currently viewing your analysis</span>
                </>
              ) : (
                <>
                  <BookUser className="w-3 h-3" />
                  <span>Switch to see your perspective</span>
                </>
              )}
            </div>
            
            {selectedPlayerIndex === 1 && (
              <div className="mt-3 pt-3 border-t border-border/40 w-full flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Activity className="w-3 h-3" />
                  <span>Your actions analyzed</span>
                </div>
                <div className="flex items-center gap-1">
                  <Award className="w-3 h-3 text-primary" />
                  <span className="text-xs font-medium text-primary">Primary player</span>
                </div>
              </div>
            )}
          </div>
        </Button>
      </div>
    </div>
  );
};

export default PlayerSelector;
