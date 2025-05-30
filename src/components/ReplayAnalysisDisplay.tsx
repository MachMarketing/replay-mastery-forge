/**
 * Updated Replay-Analyse Display für screp-core Parser
 */

import React from 'react';
import { NewFinalReplayResult } from '@/services/nativeReplayParser/newScrepParser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Users, Map, Target, TrendingUp, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { BuildOrderAnalysis } from './BuildOrderAnalysis';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ReplayAnalysisDisplayProps {
  replayData: NewFinalReplayResult;
}

export const ReplayAnalysisDisplay: React.FC<ReplayAnalysisDisplayProps> = ({ replayData }) => {
  const { header, players, gameplayAnalysis, buildOrderAnalysis, dataQuality } = replayData;

  // Check if build order data is actually available
  const hasBuildOrderData = Object.values(buildOrderAnalysis).some(
    analysis => analysis.timeline.actions.length > 0
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Spiel-Übersicht */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Spiel-Übersicht - screp-core Parser
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
                ✅ {dataQuality.commandsFound > 0 ? `${dataQuality.commandsFound} CMD` : 'Basis'}
              </div>
              <div className="text-sm text-muted-foreground">Commands</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Alert für screp-core */}
      {dataQuality.commandsFound > 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>screp-core Parsing erfolgreich:</strong> {dataQuality.commandsFound} Commands extrahiert mit vollständiger Build Order Analyse!
          </AlertDescription>
        </Alert>
      )}

      {/* Warning für wenige Commands */}
      {dataQuality.commandsFound === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Keine Commands extrahiert:</strong> screp-core konnte keine Commands aus diesem Replay extrahieren. 
            APM/EAPM Analyse basiert auf Datei-Metadaten.
          </AlertDescription>
        </Alert>
      )}

      {/* Spieler-Vergleich */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Spieler-Vergleich - APM/EAPM Analyse
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
                      {analysis && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Spielstil: {analysis.playstyle}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-500">{player.eapm} EAPM</div>
                      <div className="text-sm text-muted-foreground">{player.apm} APM</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>APM Effizienz</span>
                        <span className={player.efficiency > 70 ? 'text-green-500' : player.efficiency > 50 ? 'text-yellow-500' : 'text-red-500'}>
                          {player.efficiency}%
                        </span>
                      </div>
                      <Progress value={player.efficiency} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Effective APM</span>
                        <span className="text-blue-500">{player.eapm}</span>
                      </div>
                      <Progress value={(player.eapm / Math.max(player.apm, 1)) * 100} className="h-2" />
                    </div>
                  </div>

                  {/* APM Breakdown */}
                  {analysis && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-3">
                      <div className="text-sm font-medium text-blue-800 mb-2">
                        🎯 APM Breakdown:
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
                        <div>Effective: {analysis.apmBreakdown.effective}</div>
                        <div>Economic: {analysis.apmBreakdown.economic}</div>
                        <div>Micro: {analysis.apmBreakdown.micro}</div>
                        <div>Spam: {analysis.apmBreakdown.spam}</div>
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {analysis && analysis.recommendations.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded p-3 mt-3">
                      <div className="text-sm font-medium text-green-800 mb-1">
                        💡 Empfehlung:
                      </div>
                      <div className="text-sm text-green-700">
                        {analysis.recommendations[0]}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Conditional Analysis Tabs */}
      {hasBuildOrderData ? (
        <Tabs defaultValue="player-0" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            {players.map((player, index) => (
              <TabsTrigger key={index} value={`player-${index}`}>
                {player.name} - Build Order ({buildOrderAnalysis[index]?.timeline.actions.length || 0} actions)
              </TabsTrigger>
            ))}
          </TabsList>
          
          {players.map((player, index) => {
            const buildAnalysis = buildOrderAnalysis[index];
            
            return (
              <TabsContent key={index} value={`player-${index}`}>
                {buildAnalysis && buildAnalysis.timeline.actions.length > 0 ? (
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
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              screp-core Build Order Analyse
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-xl font-semibold mb-3">Keine Commands extrahiert</h3>
              <p className="mb-4">
                screp-core konnte keine Commands aus diesem Replay extrahieren.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded p-4 text-left max-w-md mx-auto">
                <h4 className="font-medium text-blue-800 mb-2">🔧 screp-core Status:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Parser: {dataQuality.source}</li>
                  <li>• Qualität: {dataQuality.reliability}</li>
                  <li>• Commands: {dataQuality.commandsFound}</li>
                  <li>• APM berechnet: {dataQuality.apmCalculated ? '✅' : '❌'}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Updated Datenqualität */}
      <Card>
        <CardHeader>
          <CardTitle>screp-core Analyse-Qualität & Details</CardTitle>
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
              <div className="text-muted-foreground">
                {dataQuality.commandsFound} {dataQuality.commandsFound === 0 ? '(nicht extrahiert)' : '✅'}
              </div>
            </div>
            <div>
              <div className="font-medium">Implementation</div>
              <div className="text-muted-foreground">
                screp GitHub Repo ✅
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
