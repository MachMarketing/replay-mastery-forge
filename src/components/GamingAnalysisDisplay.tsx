
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Zap,
  Sword,
  Shield,
  Star,
  Crown
} from 'lucide-react';
import { ParsedReplayResult } from '@/services/replayParser/types';

interface GamingAnalysisDisplayProps {
  isAnalyzing: boolean;
  analysisComplete: boolean;
  replayData: ParsedReplayResult | null;
  rawParsedData: ParsedReplayResult | null;
  selectedPlayerIndex: number;
  isPremium: boolean;
  onPlayerSelect: (playerIndex: number, data: ParsedReplayResult) => void;
}

const GamingAnalysisDisplay: React.FC<GamingAnalysisDisplayProps> = ({
  isAnalyzing,
  analysisComplete,
  replayData,
  rawParsedData,
  selectedPlayerIndex,
  isPremium,
  onPlayerSelect,
}) => {
  
  if (isAnalyzing) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 rounded-xl border border-blue-500/20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
        
        <CardHeader className="relative z-10 bg-black/20 backdrop-blur-sm border-b border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-400/30">
              <Zap className="h-6 w-6 text-blue-400 animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-xl text-white font-bold">ANALYSIERE REPLAY</CardTitle>
              <CardDescription className="text-blue-200">
                KI-gestützte Performance-Analyse läuft...
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="relative z-10 p-8">
          <div className="flex flex-col items-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-blue-500/30 border-t-blue-400 animate-spin"></div>
              <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-purple-500/20 border-b-purple-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '3s' }}></div>
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-white">Datenverarbeitung läuft</h3>
              <p className="text-blue-200 text-sm">Build Order • Strategien • Performance-Metriken</p>
            </div>
            
            <div className="w-full max-w-md space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-blue-200">Analysiere Spielerdaten...</span>
                <span className="text-blue-400">87%</span>
              </div>
              <Progress value={87} className="h-2 bg-blue-900/50" />
            </div>
          </div>
        </CardContent>
      </div>
    );
  }

  if (!analysisComplete || !replayData || !rawParsedData) {
    return (
      <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-xl border border-gray-700/50 p-8 text-center">
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gray-700/50 flex items-center justify-center">
            <Trophy className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-white">Bereit für Analyse</h3>
          <p className="text-gray-400">Lade dein Replay hoch, um eine professionelle Analyse zu erhalten.</p>
        </div>
      </div>
    );
  }
  
  const selectedPlayerData = selectedPlayerIndex === 0 
    ? replayData.primaryPlayer
    : replayData.secondaryPlayer;
    
  const otherPlayerData = selectedPlayerIndex === 0
    ? replayData.secondaryPlayer
    : replayData.primaryPlayer;
  
  const isWinner = replayData.result === 'win';
  
  return (
    <div className="space-y-6">
      {/* Header Card - Gaming Style */}
      <div className={`relative overflow-hidden rounded-xl border-2 ${isWinner ? 'border-green-500/50 bg-gradient-to-br from-green-900/30 via-emerald-900/20 to-green-800/30' : 'border-red-500/50 bg-gradient-to-br from-red-900/30 via-rose-900/20 to-red-800/30'}`}>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        
        <CardContent className="relative z-10 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${isWinner ? 'bg-green-500/20 border border-green-400/30' : 'bg-red-500/20 border border-red-400/30'}`}>
                {isWinner ? (
                  <Crown className="h-8 w-8 text-green-400" />
                ) : (
                  <Sword className="h-8 w-8 text-red-400" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedPlayerData.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <Badge variant="outline" className={`${getRaceColor(selectedPlayerData.race)} font-semibold`}>
                    {selectedPlayerData.race}
                  </Badge>
                  <span className="text-gray-300">vs</span>
                  <Badge variant="outline" className={`${getRaceColor(otherPlayerData.race)} font-semibold`}>
                    {otherPlayerData.name} ({otherPlayerData.race})
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className={`text-3xl font-bold ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
                {isWinner ? 'SIEG' : 'NIEDERLAGE'}
              </div>
              <div className="text-gray-400 text-sm">{replayData.duration} • {replayData.map}</div>
            </div>
          </div>
          
          {/* Performance Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-gray-600/30">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-blue-400" />
                <span className="text-gray-300 text-sm">APM</span>
              </div>
              <div className="text-2xl font-bold text-white">{selectedPlayerData.apm}</div>
            </div>
            
            <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-gray-600/30">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-purple-400" />
                <span className="text-gray-300 text-sm">EAPM</span>
              </div>
              <div className="text-2xl font-bold text-white">{selectedPlayerData.eapm}</div>
            </div>
            
            <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-gray-600/30">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-orange-400" />
                <span className="text-gray-300 text-sm">Dauer</span>
              </div>
              <div className="text-2xl font-bold text-white">{replayData.duration}</div>
            </div>
            
            <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-gray-600/30">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-yellow-400" />
                <span className="text-gray-300 text-sm">Matchup</span>
              </div>
              <div className="text-2xl font-bold text-white">{replayData.matchup}</div>
            </div>
          </div>
        </CardContent>
      </div>
      
      {/* Player Selection */}
      <Card className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-400" />
            Spieler-Perspektive
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button 
              variant={selectedPlayerIndex === 0 ? "default" : "outline"} 
              onClick={() => onPlayerSelect(0, rawParsedData)}
              className={`flex items-center gap-2 ${selectedPlayerIndex === 0 ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-600 text-gray-300 hover:bg-gray-800'}`}
            >
              <Crown className="h-4 w-4" />
              {replayData.primaryPlayer.name}
              <Badge variant="secondary" className="ml-1">
                {replayData.primaryPlayer.race.charAt(0)}
              </Badge>
            </Button>
            <Button 
              variant={selectedPlayerIndex === 1 ? "default" : "outline"} 
              onClick={() => onPlayerSelect(1, rawParsedData)}
              className={`flex items-center gap-2 ${selectedPlayerIndex === 1 ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-600 text-gray-300 hover:bg-gray-800'}`}
            >
              <Sword className="h-4 w-4" />
              {replayData.secondaryPlayer.name}
              <Badge variant="secondary" className="ml-1">
                {replayData.secondaryPlayer.race.charAt(0)}
              </Badge>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Sections */}
      <Card className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white">Performance-Analyse</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={["build-order", "strengths"]} className="w-full">
            <AccordionItem value="build-order" className="border-gray-700/50">
              <AccordionTrigger className="text-white hover:text-blue-400">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-400" />
                  Build Order Analyse
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="bg-black/20 rounded-lg p-4 border border-gray-700/30">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700/50 hover:bg-gray-800/30">
                        <TableHead className="text-gray-300">Zeit</TableHead>
                        <TableHead className="text-gray-300">Aktion</TableHead>
                        <TableHead className="text-gray-300">Supply</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPlayerData.buildOrder.length > 0 ? (
                        selectedPlayerData.buildOrder.map((item, index) => (
                          <TableRow key={index} className="border-gray-700/30 hover:bg-gray-800/20">
                            <TableCell className="font-mono text-blue-400">{item.time}</TableCell>
                            <TableCell className="text-white">{item.action}</TableCell>
                            <TableCell className="text-gray-300">{item.supply}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-gray-400">
                            Keine Build Order Daten verfügbar
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="strengths" className="border-gray-700/50">
              <AccordionTrigger className="text-white hover:text-green-400">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  Stärken
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {selectedPlayerData.strengths && selectedPlayerData.strengths.length > 0 ? (
                    selectedPlayerData.strengths.map((strength, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-green-900/20 rounded-lg border border-green-500/20">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-green-100">{strength}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400">Keine Stärken analysiert</p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="weaknesses" className="border-gray-700/50">
              <AccordionTrigger className="text-white hover:text-red-400">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  Verbesserungspotential
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {selectedPlayerData.weaknesses && selectedPlayerData.weaknesses.length > 0 ? (
                    selectedPlayerData.weaknesses.map((weakness, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-red-900/20 rounded-lg border border-red-500/20">
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        <span className="text-red-100">{weakness}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400">Keine Schwächen gefunden</p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="recommendations" className="border-gray-700/50">
              <AccordionTrigger className="text-white hover:text-yellow-400">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-yellow-400" />
                  Empfehlungen
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {selectedPlayerData.recommendations && selectedPlayerData.recommendations.length > 0 ? (
                    selectedPlayerData.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-yellow-900/20 rounded-lg border border-yellow-500/20">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <span className="text-yellow-100">{recommendation}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400">Keine Empfehlungen verfügbar</p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};

function getRaceColor(race: string): string {
  switch (race) {
    case 'Terran':
      return 'text-blue-400 border-blue-400/50';
    case 'Protoss':
      return 'text-yellow-400 border-yellow-400/50';
    case 'Zerg':
      return 'text-purple-400 border-purple-400/50';
    default:
      return 'text-gray-400 border-gray-400/50';
  }
}

export default GamingAnalysisDisplay;
