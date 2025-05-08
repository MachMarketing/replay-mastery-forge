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
import { ParsedReplayResult } from '@/services/replayParser/types';

interface AnalysisDisplayProps {
  isAnalyzing: boolean;
  analysisComplete: boolean;
  replayData: ParsedReplayResult | null;
  rawParsedData: ParsedReplayResult | null;
  selectedPlayerIndex: number;
  isPremium: boolean;
  onPlayerSelect: (playerIndex: number, data: ParsedReplayResult) => void;
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
    
    // Log data for debugging
    console.log("AnalysisDisplay - Rendering with data:", {
      selectedPlayerIndex,
      replayData: {
        primaryPlayer: replayData.primaryPlayer,
        secondaryPlayer: replayData.secondaryPlayer,
        primaryBuildOrderItems: replayData.primaryPlayer.buildOrder.length,
        secondaryBuildOrderItems: replayData.secondaryPlayer.buildOrder.length
      }
    });
    
    // Determine which player data to show based on selected index
    const primaryPlayerData = selectedPlayerIndex === 0 
      ? replayData.primaryPlayer
      : replayData.secondaryPlayer;
      
    const secondaryPlayerData = selectedPlayerIndex === 0
      ? replayData.secondaryPlayer
      : replayData.primaryPlayer;
      
    // Use the data directly from the selected player
    const selectedPlayerData = primaryPlayerData;
    const otherPlayerData = secondaryPlayerData;

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
                {replayData.primaryPlayer.name} ({replayData.primaryPlayer.race})
              </Button>
              <Button 
                variant={selectedPlayerIndex === 1 ? "secondary" : "outline"} 
                onClick={() => onPlayerSelect(1, rawParsedData)}
              >
                {replayData.secondaryPlayer.name} ({replayData.secondaryPlayer.race})
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
                    {selectedPlayerData.buildOrder.length > 0 ? (
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
