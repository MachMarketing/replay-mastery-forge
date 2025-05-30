
/**
 * Vollständig überarbeitete Replay-Analyse mit intelligenter Build Order Analyse
 */

import React from 'react';
import { FinalReplayResult } from '@/services/nativeReplayParser/screpJsParser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Users, Map, Target, TrendingUp, Zap } from 'lucide-react';
import { BuildOrderAnalysis } from './BuildOrderAnalysis';

interface ReplayAnalysisDisplayProps {
  replayData: FinalReplayResult;
}

export const ReplayAnalysisDisplay: React.FC<ReplayAnalysisDisplayProps> = ({ replayData }) => {
  const { header, players, gameplayAnalysis, buildOrderAnalysis, dataQuality } = replayData;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Spiel-Übersicht */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Spiel-Übersicht
            <Badge variant={dataQuality.reliability === 'high' ? 'default' : 'secondary'}>
              {dataQuality.source} - {dataQuality.reliability}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{header.mapName}</div>
              <div className="text-sm text-muted-foreground">Karte</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{header.duration}</div>
              <div className="text-sm text-muted-foreground">Spieldauer</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">{header.gameType}</div>
              <div className="text-sm text-muted-foreground">Spieltyp</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">
                ✅ {dataQuality.apmCalculated && dataQuality.eapmCalculated ? 'EAPM' : 'Basis'}
              </div>
              <div className="text-sm text-muted-foreground">Analyse</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Spieler-Vergleich */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Spieler-Vergleich
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {players.map((player, index) => {
              const analysis = gameplayAnalysis[index];
              const buildAnalysis = buildOrderAnalysis[index];
              
              return (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="font-bold text-lg">{player.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {player.race} • Team {player.team}
                      </div>
                      {buildAnalysis && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Strategie: {buildAnalysis.timeline.analysis.strategy}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{player.eapm} EAPM</div>
                      <div className="text-sm text-muted-foreground">{player.apm} APM</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Effizienz</span>
                        <span className={player.efficiency > 70 ? 'text-green-500' : player.efficiency > 50 ? 'text-yellow-500' : 'text-red-500'}>
                          {player.efficiency}%
                        </span>
                      </div>
                      <Progress value={player.efficiency} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Build Order Effizienz</span>
                        <span className={buildAnalysis?.timeline.analysis.efficiency > 70 ? 'text-green-500' : buildAnalysis?.timeline.analysis.efficiency > 50 ? 'text-yellow-500' : 'text-red-500'}>
                          {buildAnalysis?.timeline.analysis.efficiency || 0}%
                        </span>
                      </div>
                      <Progress value={buildAnalysis?.timeline.analysis.efficiency || 0} className="h-2" />
                    </div>
                  </div>

                  {buildAnalysis && buildAnalysis.insights.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-3">
                      <div className="text-sm font-medium text-blue-800 mb-1">
                        🔍 Wichtigster Verbesserungsvorschlag:
                      </div>
                      <div className="text-sm text-blue-700">
                        {buildAnalysis.insights[0].actionable}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detaillierte Analyse pro Spieler */}
      <Tabs defaultValue="player-0" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          {players.map((player, index) => (
            <TabsTrigger key={index} value={`player-${index}`}>
              {player.name} ({player.race})
            </TabsTrigger>
          ))}
        </TabsList>
        
        {players.map((player, index) => {
          const buildAnalysis = buildOrderAnalysis[index];
          
          return (
            <TabsContent key={index} value={`player-${index}`}>
              {buildAnalysis ? (
                <BuildOrderAnalysis 
                  timeline={buildAnalysis.timeline}
                  insights={buildAnalysis.insights}
                />
              ) : (
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center text-muted-foreground">
                      <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">Build Order Analyse nicht verfügbar</h3>
                      <p>Commands konnten nicht von screp-js extrahiert werden.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Datenqualität */}
      <Card>
        <CardHeader>
          <CardTitle>Analyse-Qualität</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium">Parser</div>
              <div className="text-muted-foreground">{dataQuality.source}</div>
            </div>
            <div>
              <div className="font-medium">Qualität</div>
              <div className="text-muted-foreground">{dataQuality.reliability}</div>
            </div>
            <div>
              <div className="font-medium">Commands</div>
              <div className="text-muted-foreground">{dataQuality.commandsFound}</div>
            </div>
            <div>
              <div className="font-medium">Spieler</div>
              <div className="text-muted-foreground">{dataQuality.playersFound}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
