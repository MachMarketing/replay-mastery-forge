
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AnalyzedReplayResult } from '@/services/replayParserService';

interface AnalysisDisplayProps {
  isAnalyzing: boolean;
  analysisComplete: boolean;
  replayData: AnalyzedReplayResult | null;
  rawParsedData: AnalyzedReplayResult | null;
  selectedPlayerIndex: number;
  isPremium: boolean;
  onPlayerSelect: (playerIndex: number, data: AnalyzedReplayResult) => void;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({
  isAnalyzing,
  analysisComplete,
  replayData,
  rawParsedData,
  selectedPlayerIndex,
  isPremium,
  onPlayerSelect,
}) => {
  // Helper function to format APM
  const formatApm = (apm: number): string => {
    return apm ? apm.toFixed(0) : 'N/A';
  };
  
  // Helper function to format race
  const formatRace = (race: string): string => {
    return race || 'Unknown';
  };

  const renderAnalysis = () => {
    if (isAnalyzing) {
      return (
        <Card className="shadow-md">
          <CardHeader className="bg-card border-b">
            <CardTitle className="text-lg">Analyse läuft...</CardTitle>
            <CardDescription>Bitte warte, während wir dein Replay analysieren.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      );
    }

    if (!analysisComplete || !replayData || !rawParsedData) {
      return (
        <Card className="shadow-md">
          <CardHeader className="bg-card border-b">
            <CardTitle className="text-lg">Keine Analyse verfügbar</CardTitle>
            <CardDescription>Lade ein Replay hoch, um eine Analyse zu sehen.</CardDescription>
          </CardHeader>
          <CardContent className="text-center p-6">
            <p className="text-muted-foreground">Bitte lade zuerst ein Replay hoch.</p>
          </CardContent>
        </Card>
      );
    }
    
    // Extract data from replayData
    const {
      playerName: actualPlayerName,
      opponentName: actualOpponentName,
      playerRace: actualPlayerRace,
      opponentRace: actualOpponentRace,
      apm: actualPlayerApm,
      eapm: actualPlayerEapm,
      opponentApm: actualOpponentApm,
      opponentEapm: actualOpponentEapm,
      buildOrder: primaryPlayerBuildOrder,
    } = replayData;
    
    const { buildOrder: secondaryPlayerBuildOrder } = rawParsedData;

    const displayData = {
      primaryPlayer: {
        name: selectedPlayerIndex === 0 ? 
              actualPlayerName : 
              actualOpponentName,
        race: selectedPlayerIndex === 0 ? 
              actualPlayerRace : 
              actualOpponentRace,
        apm: selectedPlayerIndex === 0 ? 
             actualPlayerApm : 
             actualOpponentApm,
        eapm: selectedPlayerIndex === 0 ? 
              actualPlayerEapm : 
              actualOpponentEapm,
        
        // WICHTIG: Use the correct build order based on actual parsed data
        buildOrder: selectedPlayerIndex === 0 ? 
                   primaryPlayerBuildOrder : 
                   secondaryPlayerBuildOrder,
        
        strengths: ['Aggressiver Start', 'Gutes Makro'],
        weaknesses: ['Schwache Verteidigung', 'Ineffizientes Scouting'],
        recommendations: ['Fokus auf Early-Game-Defense', 'Verbessere das Scouting']
      },
      secondaryPlayer: {
        name: selectedPlayerIndex === 0 ? 
              actualOpponentName : 
              actualPlayerName,
        race: selectedPlayerIndex === 0 ? 
              actualOpponentRace : 
              actualPlayerRace,
        apm: selectedPlayerIndex === 0 ? 
             actualOpponentApm : 
             actualPlayerApm,
        eapm: selectedPlayerIndex === 0 ? 
              actualOpponentEapm : 
              actualPlayerEapm,
        
        // WICHTIG: Use the correct build order based on actual parsed data
        buildOrder: selectedPlayerIndex === 0 ? 
                   secondaryPlayerBuildOrder : 
                   primaryPlayerBuildOrder,
        
        strengths: ['Starke Mid-Game-Angriffe', 'Gutes Multitasking'],
        weaknesses: ['Spätes Spiel unsicher', 'Schlechtes Ressourcenmanagement'],
        recommendations: ['Übe Late-Game-Übergänge', 'Optimiere Ressourcen']
      }
    };
    
    const selectedPlayerData = selectedPlayerIndex === 0 ? displayData.primaryPlayer : displayData.secondaryPlayer;
    const otherPlayerData = selectedPlayerIndex === 0 ? displayData.secondaryPlayer : displayData.primaryPlayer;

    return (
      <Card className="shadow-md">
        <CardHeader className="bg-card border-b">
          <CardTitle className="text-lg">Analyse</CardTitle>
          <CardDescription>Detaillierte Analyse deines Replays.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold">{selectedPlayerData.name}</h3>
              <p className="text-muted-foreground">
                Rasse: {formatRace(selectedPlayerData.race)} | APM: {formatApm(selectedPlayerData.apm)}
              </p>
            </div>
            <Avatar>
              <AvatarImage src={`/images/races/${selectedPlayerData.race}.png`} alt={selectedPlayerData.name} />
              <AvatarFallback>{selectedPlayerData.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold">{otherPlayerData.name}</h3>
              <p className="text-muted-foreground">
                Rasse: {formatRace(otherPlayerData.race)} | APM: {formatApm(otherPlayerData.apm)}
              </p>
            </div>
            <Avatar>
              <AvatarImage src={`/images/races/${otherPlayerData.race}.png`} alt={otherPlayerData.name} />
              <AvatarFallback>{otherPlayerData.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
          </div>

          <div className="mb-4">
            <h4 className="text-lg font-semibold mb-2">Spieler-Perspektive</h4>
            <div className="flex gap-2">
              <Button 
                variant={selectedPlayerIndex === 0 ? "secondary" : "outline"} 
                onClick={() => onPlayerSelect(0, rawParsedData)}
              >
                {actualPlayerName} ({actualPlayerRace})
              </Button>
              <Button 
                variant={selectedPlayerIndex === 1 ? "secondary" : "outline"} 
                onClick={() => onPlayerSelect(1, rawParsedData)}
              >
                {actualOpponentName} ({actualOpponentRace})
              </Button>
            </div>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="build-order">
              <AccordionTrigger>Build Order</AccordionTrigger>
              <AccordionContent>
                <Table>
                  <TableCaption>Detaillierte Build Order Analyse</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Zeit</TableHead>
                      <TableHead>Aktion</TableHead>
                      <TableHead>Versorgung</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPlayerData.buildOrder && selectedPlayerData.buildOrder.length > 0 ? (
                      selectedPlayerData.buildOrder.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.time}</TableCell>
                          <TableCell>{item.action}</TableCell>
                          <TableCell>{item.supply}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center">Keine Build Order Daten verfügbar</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="strengths">
              <AccordionTrigger>Stärken</AccordionTrigger>
              <AccordionContent>
                {selectedPlayerData.strengths && selectedPlayerData.strengths.length > 0 ? (
                  <ul className="list-disc pl-5">
                    {selectedPlayerData.strengths.map((strength, index) => (
                      <li key={index}>{strength}</li>
                    ))}
                  </ul>
                ) : (
                  <p>Keine Stärken gefunden</p>
                )}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="weaknesses">
              <AccordionTrigger>Schwächen</AccordionTrigger>
              <AccordionContent>
                {selectedPlayerData.weaknesses && selectedPlayerData.weaknesses.length > 0 ? (
                  <ul className="list-disc pl-5">
                    {selectedPlayerData.weaknesses.map((weakness, index) => (
                      <li key={index}>{weakness}</li>
                    ))}
                  </ul>
                ) : (
                  <p>Keine Schwächen gefunden</p>
                )}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="recommendations">
              <AccordionTrigger>Empfehlungen</AccordionTrigger>
              <AccordionContent>
                {selectedPlayerData.recommendations && selectedPlayerData.recommendations.length > 0 ? (
                  <ul className="list-disc pl-5">
                    {selectedPlayerData.recommendations.map((recommendation, index) => (
                      <li key={index}>{recommendation}</li>
                    ))}
                  </ul>
                ) : (
                  <p>Keine Empfehlungen gefunden</p>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {isPremium && (
            <>
              <Separator className="my-4" />
              <div className="text-center">
                <Badge variant="outline">Premium-Funktionen freischalten</Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  Erhalte Zugriff auf erweiterte Analysen und personalisiertes Coaching.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  return renderAnalysis();
};

export default AnalysisDisplay;
