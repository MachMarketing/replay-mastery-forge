
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExtendedReplayData } from '@/services/replayParser/types';
import AdvancedAnalysisDisplay from './AdvancedAnalysisDisplay';
import { Eye, User, Users, FileDown, Calendar, LineChart } from 'lucide-react';
import PlayerSelector from './PlayerSelector';

interface AdvancedAnalysisResultProps {
  data: ExtendedReplayData;
  isPremium?: boolean;
}

const AdvancedAnalysisResult: React.FC<AdvancedAnalysisResultProps> = ({ data, isPremium = false }) => {
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  
  const handlePlayerChange = (playerIndex: number) => {
    setActivePlayerIndex(playerIndex);
  };
  
  const handleDownloadReplayData = () => {
    // Create a blob with the replay data
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    
    // Create an anchor element and trigger download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `replay-analysis-${data.primaryPlayer.name}-vs-${data.secondaryPlayer.name}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="space-y-6">
      {/* Game Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Spielinformationen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm text-muted-foreground mr-1">Matchup:</span>
              <Badge variant="outline">{data.matchup}</Badge>
            </div>
            
            <div className="flex items-center">
              <LineChart className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm text-muted-foreground mr-1">Map:</span>
              <span className="text-sm font-medium">{data.map}</span>
            </div>
            
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm text-muted-foreground mr-1">Datum:</span>
              <span className="text-sm font-medium">
                {new Date(data.date).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <div className="flex items-center mt-4 justify-between">
            <PlayerSelector
              primaryPlayer={{
                name: data.primaryPlayer.name,
                race: data.primaryPlayer.race,
                apm: data.primaryPlayer.apm
              }}
              secondaryPlayer={{
                name: data.secondaryPlayer.name,
                race: data.secondaryPlayer.race,
                apm: data.secondaryPlayer.apm
              }}
              selectedPlayerIndex={activePlayerIndex}
              onPlayerSelect={handlePlayerChange}
            />
            
            <Button variant="outline" size="sm" onClick={handleDownloadReplayData}>
              <FileDown className="h-4 w-4 mr-2" />
              Daten exportieren
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Advanced Analysis Display */}
      <AdvancedAnalysisDisplay 
        data={data}
        activePlayerIndex={activePlayerIndex}
        isPremium={isPremium}
      />
      
      {!isPremium && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <Badge className="bg-amber-500 hover:bg-amber-600">Premium</Badge>
              <p className="font-medium">Upgrade auf Premium für vollständige Analyse</p>
              <p className="text-sm text-muted-foreground">
                Erhalte Zugang zu allen erweiterten Metriken und personalisierten Empfehlungen
              </p>
              <Button className="mt-4 bg-amber-500 hover:bg-amber-600">
                Auf Premium upgraden
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdvancedAnalysisResult;
