import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ParsedReplayData } from '@/hooks/useReplayParser';

interface AnalysisResultProps {
  replayData: ParsedReplayData;
  onReset: () => void;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ replayData, onReset }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const formatAPM = (apm: number) => `${apm} APM`;

  const player1 = replayData.players[0];
  const player2 = replayData.players[1];
  const apm1 = player1?.apm || 0;
  const apm2 = player2?.apm || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">Replay Analysis</CardTitle>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant="outline" className="text-sm">
                SC:R Parser
              </Badge>
              <Badge variant="outline" className="text-sm">
                {replayData.buildOrder.length} Build Order Actions
              </Badge>
            </div>
          </div>
          <Button variant="outline" onClick={onReset}>
            Analyze Another Replay
          </Button>
        </CardHeader>
      </Card>

      {/* Analysis Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="build-orders">Build Orders</TabsTrigger>
          <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
          <TabsTrigger value="raw-data">Raw Data</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Game Info */}
            <Card>
              <CardHeader>
                <CardTitle>Game Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Map:</span>
                  <span className="font-medium">{replayData.header.mapName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{replayData.header.gameLength}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Players:</span>
                  <span className="font-medium">{replayData.players.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Build Actions:</span>
                  <Badge variant="outline">{replayData.buildOrder.length}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Players */}
            <Card>
              <CardHeader>
                <CardTitle>Players</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {replayData.players.map((player, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{player.name}</div>
                      <div className="text-sm text-muted-foreground">{player.race}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatAPM(player.apm)}</div>
                      <div className="text-sm text-muted-foreground">APM</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="build-orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Build Order Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {replayData.buildOrder.length > 0 ? (
                <div className="space-y-2">
                  {replayData.buildOrder.slice(0, 20).map((entry, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-mono">{entry.time}</span>
                      <span className="text-sm">{entry.action}</span>
                      <span className="text-sm text-muted-foreground">
                        {entry.unit || entry.building || 'Action'}
                      </span>
                    </div>
                  ))}
                  {replayData.buildOrder.length > 20 && (
                    <div className="text-sm text-muted-foreground text-center py-2">
                      ... and {replayData.buildOrder.length - 20} more entries
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No build order data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* APM Comparison */}
              <div>
                <h3 className="text-lg font-semibold mb-4">APM Comparison</h3>
                <div className="space-y-4">
                  {replayData.players.map((player, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-24 text-sm font-medium">{player.name}</div>
                      <div className="flex-1">
                        <Progress value={Math.min((player.apm / 300) * 100, 100)} className="h-2" />
                      </div>
                      <div className="w-16 text-right text-sm font-medium">{player.apm} APM</div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* AI Analysis Results */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Strengths */}
                <div>
                  <h4 className="text-md font-semibold text-green-600 mb-3">Strengths</h4>
                  {replayData.analysis.strengths.length > 0 ? (
                    <ul className="text-sm space-y-1">
                      {replayData.analysis.strengths.map((strength, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-green-500 mt-1">•</span>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No specific strengths identified</p>
                  )}
                </div>

                {/* Weaknesses */}
                <div>
                  <h4 className="text-md font-semibold text-red-600 mb-3">Weaknesses</h4>
                  {replayData.analysis.weaknesses.length > 0 ? (
                    <ul className="text-sm space-y-1">
                      {replayData.analysis.weaknesses.map((weakness, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-red-500 mt-1">•</span>
                          <span>{weakness}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No specific weaknesses identified</p>
                  )}
                </div>

                {/* Recommendations */}
                <div>
                  <h4 className="text-md font-semibold text-blue-600 mb-3">Recommendations</h4>
                  {replayData.analysis.recommendations.length > 0 ? (
                    <ul className="text-sm space-y-1">
                      {replayData.analysis.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-500 mt-1">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No specific recommendations available</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="raw-data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Raw Data</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-96">
                {JSON.stringify(replayData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};