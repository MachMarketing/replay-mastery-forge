import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Target, AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react';
import type { EnhancedReplayData } from '@/hooks/useEnhancedReplayParser';

interface ProAnalysisDashboardProps {
  data: EnhancedReplayData;
}

const ProAnalysisDashboard: React.FC<ProAnalysisDashboardProps> = ({ data }) => {
  if (!data.success) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Parsing-Fehler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {data.error || 'Die Replay-Datei konnte nicht analysiert werden.'}
            </p>
            <div className="space-y-2">
              {data.analysis.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Target className="w-4 h-4 text-primary mt-0.5" />
                  <span className="text-sm">{rec}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getRaceIcon = (race: string) => {
    const colors = {
      'Protoss': 'bg-yellow-500',
      'Terran': 'bg-blue-500', 
      'Zerg': 'bg-purple-500',
      'Random': 'bg-gray-500'
    };
    return colors[race as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Match Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getRaceIcon(data.playerRace)}`}></div>
                <span className="font-semibold">{data.playerName}</span>
                <Badge variant="secondary">{data.playerRace}</Badge>
              </div>
              <span className="text-sm text-muted-foreground">vs</span>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{data.opponentRace}</Badge>
                <span className="font-semibold">{data.opponentName}</span>
                <div className={`w-3 h-3 rounded-full ${getRaceIcon(data.opponentRace)}`}></div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Map</p>
                <p className="font-medium">{data.mapName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dauer</p>
                <p className="font-medium">{formatDuration(data.matchDurationSeconds)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Performance Metriken
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">APM</p>
                <p className="text-2xl font-bold text-primary">{data.apm}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">EAPM</p>
                <p className="text-2xl font-bold text-primary">{data.eapm}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">APM Rating</span>
                <span className="text-sm font-medium">
                  {data.apm > 200 ? 'Excellent' : data.apm > 150 ? 'Good' : data.apm > 100 ? 'Average' : 'Needs Work'}
                </span>
              </div>
              <Progress 
                value={Math.min((data.apm / 300) * 100, 100)} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="build-order" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="build-order">Build Order</TabsTrigger>
          <TabsTrigger value="key-moments">Key Moments</TabsTrigger>
          <TabsTrigger value="strengths">Stärken</TabsTrigger>
          <TabsTrigger value="improvements">Verbesserungen</TabsTrigger>
        </TabsList>
        
        <TabsContent value="build-order" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Build Order Analyse
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.buildOrder.length > 0 ? (
                <div className="space-y-2">
                  {data.buildOrder.slice(0, 15).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded border">
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="w-16 text-center">
                          {item.supply}
                        </Badge>
                        <span className="font-medium">{item.unitOrBuilding}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.gameTime}
                      </div>
                    </div>
                  ))}
                  {data.buildOrder.length > 15 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      ... und {data.buildOrder.length - 15} weitere Aktionen
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Keine Build Order Daten verfügbar
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="key-moments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Wichtige Momente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.keyMoments.length > 0 ? (
                <div className="space-y-3">
                  {data.keyMoments.map((moment, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded border">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                      <span>{moment}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Keine wichtigen Momente erkannt
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="strengths" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                Stärken
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.analysis.strengths.length > 0 ? (
                <div className="space-y-3">
                  {data.analysis.strengths.map((strength, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded border border-green-200 bg-green-50">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                      <span>{strength}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Noch keine Stärken identifiziert
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="improvements" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="w-5 h-5" />
                  Schwächen
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.analysis.weaknesses.length > 0 ? (
                  <div className="space-y-3">
                    {data.analysis.weaknesses.map((weakness, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded border border-orange-200 bg-orange-50">
                        <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5" />
                        <span>{weakness}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Keine Schwächen gefunden
                  </p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <TrendingUp className="w-5 h-5" />
                  Empfehlungen
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.analysis.recommendations.length > 0 ? (
                  <div className="space-y-3">
                    {data.analysis.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded border border-blue-200 bg-blue-50">
                        <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Keine Empfehlungen verfügbar
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Success Message */}
      {data.message && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">{data.message}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProAnalysisDashboard;