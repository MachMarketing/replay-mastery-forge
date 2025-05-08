
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookUser, 
  Users, 
  Crown, 
  Check, 
  Swords, 
  Shield, 
  Activity, 
  Sparkles, 
  Award, 
  Trophy, 
  Star, 
  Bolt,
  Zap
} from 'lucide-react';

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
  
  // Helper function to get race-specific glow color
  const getRaceGlowColor = (race: string): string => {
    const normalizedRace = race.toLowerCase();
    if (normalizedRace.includes('terr')) return 'shadow-[0_0_10px_rgba(37,99,235,0.5)]';
    if (normalizedRace.includes('prot')) return 'shadow-[0_0_10px_rgba(245,158,11,0.5)]';
    if (normalizedRace.includes('zerg')) return 'shadow-[0_0_10px_rgba(147,51,234,0.5)]';
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
  
  // Helper function to get race-specific UI theme elements
  const getRaceThemeElements = (race: string) => {
    const normalizedRace = race.toLowerCase();
    if (normalizedRace.includes('terr')) {
      return {
        icon: <Shield className="w-4 h-4" />,
        borderStyle: 'border-terran/30',
        overlayGradient: 'bg-gradient-to-br from-terran/20 to-transparent'
      };
    }
    if (normalizedRace.includes('prot')) {
      return {
        icon: <Zap className="w-4 h-4" />,
        borderStyle: 'border-protoss/30',
        overlayGradient: 'bg-gradient-to-br from-protoss/20 to-transparent'
      };
    }
    if (normalizedRace.includes('zerg')) {
      return {
        icon: <Bolt className="w-4 h-4" />,
        borderStyle: 'border-zerg/30',
        overlayGradient: 'bg-gradient-to-br from-zerg/20 to-transparent'
      };
    }
    return {
      icon: <Star className="w-4 h-4" />,
      borderStyle: 'border-primary/30',
      overlayGradient: 'bg-gradient-to-br from-primary/20 to-transparent'
    };
  };

  // Handlers with proper event handling
  const handleSelectPlayer = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectPlayer(index);
    console.log(`Selected player ${index + 1}`);
  };

  return (
    <div className="mb-6 relative">
      <div className="absolute inset-0 bg-gradient-to-r from-background via-primary/5 to-background -z-10"></div>
      
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground flex items-center">
          <Users className="inline-block w-4 h-4 mr-1" /> 
          <span>Wähle deinen Spieler für personalisiertes Coaching:</span>
        </div>
        
        <Badge variant="outline" className="text-xs bg-secondary/30 animate-pulse">
          <Sparkles className="w-3 h-3 mr-1 text-primary" /> 
          Perspektivwechsel verfügbar
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* First player card - Enhanced with StarCraft theme */}
        <Button
          variant="ghost"
          className={`h-auto relative flex flex-col items-start text-left transition-all duration-300 overflow-hidden group
            ${selectedPlayerIndex === 0 ? 
              `border-2 border-primary shadow-lg ${getRaceGlowColor(race1)}` : 
              "hover:bg-secondary/10 border border-border/60"}
            ${getRaceBgColor(race1)} rounded-lg`}
          onClick={handleSelectPlayer(0)}
          type="button"
        >
          {/* Background animations and effects */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm -z-10"></div>
          <div className={`absolute inset-0 ${getRaceThemeElements(race1).overlayGradient} -z-10`}></div>
          
          {/* HUD-style scan line animation when selected */}
          {selectedPlayerIndex === 0 && (
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-primary/5 to-transparent 
                animate-[scan_2s_ease-in-out_infinite] opacity-60"></div>
            </div>
          )}
          
          {/* Selection indicator - StarCraft style */}
          {selectedPlayerIndex === 0 && (
            <div className="absolute -right-10 -top-10 w-20 h-20 bg-primary/20 rounded-full
                flex items-center justify-center transform rotate-12 animate-pulse">
              <Check className="w-5 h-5 text-primary absolute bottom-5 right-5" />
            </div>
          )}

          <div className="flex items-center justify-between w-full my-3 px-4 relative z-10">
            <div className="flex items-center gap-3">
              {/* Race icon with pulsing effect */}
              <div className={`flex items-center justify-center rounded-full w-10 h-10 
                ${getRaceBgColor(race1)} ${getRaceColor(race1)} text-xl font-bold relative`}>
                {getRaceIcon(race1)}
                {selectedPlayerIndex === 0 && (
                  <span className="absolute inset-0 rounded-full border border-primary 
                    animate-[ping_2s_ease-in-out_infinite]"></span>
                )}
              </div>
              
              <div>
                <span className={`font-bold text-lg tracking-wide ${getRaceColor(race1)}`}>
                  {player1}
                </span>
                <Badge variant="outline" className={`ml-2 ${getRaceColor(race1)} border-current font-medium`}>
                  {race1}
                </Badge>
              </div>
            </div>
            
            {selectedPlayerIndex === 0 ? (
              <Trophy className="w-5 h-5 text-primary animate-pulse" />
            ) : (
              <Swords className="w-5 h-5 text-muted-foreground opacity-60 
                group-hover:opacity-100 transition-opacity group-hover:text-primary" />
            )}
          </div>
          
          <div className="w-full px-4 pb-4">
            <div className={`text-sm flex items-center transition-all gap-1 
              ${selectedPlayerIndex === 0 ? "text-foreground" : "text-muted-foreground"}`}>
              {selectedPlayerIndex === 0 ? (
                <>
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="font-medium">Aktive Analyse deiner Perspektive</span>
                </>
              ) : (
                <>
                  <BookUser className="w-3 h-3" />
                  <span>Klicken um zu deiner Perspektive zu wechseln</span>
                </>
              )}
            </div>
            
            {selectedPlayerIndex === 0 && (
              <div className="mt-3 pt-3 border-t border-border/40 w-full flex items-center 
                justify-between animate-fade-in">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Activity className="w-3 h-3" />
                  <span>Deine Aktionen analysiert</span>
                </div>
                <div className="flex items-center gap-1">
                  <Award className="w-3 h-3 text-primary" />
                  <span className="text-xs font-medium text-primary">Primärer Spieler</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Bottom border glow effect */}
          {selectedPlayerIndex === 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r 
              from-transparent via-primary to-transparent"></div>
          )}
        </Button>

        {/* Second player card - Enhanced with StarCraft theme */}
        <Button
          variant="ghost"
          className={`h-auto relative flex flex-col items-start text-left transition-all duration-300 overflow-hidden group
            ${selectedPlayerIndex === 1 ? 
              `border-2 border-primary shadow-lg ${getRaceGlowColor(race2)}` : 
              "hover:bg-secondary/10 border border-border/60"}
            ${getRaceBgColor(race2)} rounded-lg`}
          onClick={handleSelectPlayer(1)}
          type="button"
        >
          {/* Background animations and effects */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm -z-10"></div>
          <div className={`absolute inset-0 ${getRaceThemeElements(race2).overlayGradient} -z-10`}></div>
          
          {/* HUD-style scan line animation when selected */}
          {selectedPlayerIndex === 1 && (
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-primary/5 to-transparent 
                animate-[scan_2s_ease-in-out_infinite] opacity-60"></div>
            </div>
          )}
          
          {/* Selection indicator - StarCraft style */}
          {selectedPlayerIndex === 1 && (
            <div className="absolute -right-10 -top-10 w-20 h-20 bg-primary/20 rounded-full
                flex items-center justify-center transform rotate-12 animate-pulse">
              <Check className="w-5 h-5 text-primary absolute bottom-5 right-5" />
            </div>
          )}

          <div className="flex items-center justify-between w-full my-3 px-4 relative z-10">
            <div className="flex items-center gap-3">
              {/* Race icon with pulsing effect */}
              <div className={`flex items-center justify-center rounded-full w-10 h-10 
                ${getRaceBgColor(race2)} ${getRaceColor(race2)} text-xl font-bold relative`}>
                {getRaceIcon(race2)}
                {selectedPlayerIndex === 1 && (
                  <span className="absolute inset-0 rounded-full border border-primary 
                    animate-[ping_2s_ease-in-out_infinite]"></span>
                )}
              </div>
              
              <div>
                <span className={`font-bold text-lg tracking-wide ${getRaceColor(race2)}`}>
                  {player2}
                </span>
                <Badge variant="outline" className={`ml-2 ${getRaceColor(race2)} border-current font-medium`}>
                  {race2}
                </Badge>
              </div>
            </div>
            
            {selectedPlayerIndex === 1 ? (
              <Trophy className="w-5 h-5 text-primary animate-pulse" />
            ) : (
              <Shield className="w-5 h-5 text-muted-foreground opacity-60 
                group-hover:opacity-100 transition-opacity group-hover:text-primary" />
            )}
          </div>
          
          <div className="w-full px-4 pb-4">
            <div className={`text-sm flex items-center transition-all gap-1 
              ${selectedPlayerIndex === 1 ? "text-foreground" : "text-muted-foreground"}`}>
              {selectedPlayerIndex === 1 ? (
                <>
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="font-medium">Aktive Analyse deiner Perspektive</span>
                </>
              ) : (
                <>
                  <BookUser className="w-3 h-3" />
                  <span>Klicken um zu dieser Perspektive zu wechseln</span>
                </>
              )}
            </div>
            
            {selectedPlayerIndex === 1 && (
              <div className="mt-3 pt-3 border-t border-border/40 w-full flex items-center 
                justify-between animate-fade-in">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Activity className="w-3 h-3" />
                  <span>Gegner-Aktionen analysiert</span>
                </div>
                <div className="flex items-center gap-1">
                  <Award className="w-3 h-3 text-primary" />
                  <span className="text-xs font-medium text-primary">Primärer Spieler</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Bottom border glow effect */}
          {selectedPlayerIndex === 1 && (
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r 
              from-transparent via-primary to-transparent"></div>
          )}
        </Button>
      </div>
      
      {/* Add StarCraft-inspired decorative element */}
      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-border to-transparent mt-2"></div>
      <div className="flex justify-center">
        <div className="px-4 py-1 -mt-[1px] text-xs text-muted-foreground bg-background border-x border-b border-border/30 
          rounded-b-md">SC:BW REPLAY ANALYSIS</div>
      </div>
    </div>
  );
};

export default PlayerSelector;
