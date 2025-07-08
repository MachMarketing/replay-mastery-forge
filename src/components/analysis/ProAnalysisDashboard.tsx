/**
 * Professional SC:R Analysis Dashboard
 * Designed for pro-level gameplay improvement and recurring usage
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { JssuhReplayResult } from '@/services/nativeReplayParser/jssuhParser';
import { 
  TrendingUp, 
  Zap, 
  Target, 
  Trophy, 
  Activity, 
  Clock,
  Users,
  Building,
  Sword,
  Brain,
  BarChart3,
  LineChart,
  PieChart,
  Star,
  ChevronRight,
  Download,
  Share2
} from 'lucide-react';

interface ProAnalysisDashboardProps {
  data: JssuhReplayResult;
}

const ProAnalysisDashboard: React.FC<ProAnalysisDashboardProps> = ({ data }) => {
  const [activePlayer, setActivePlayer] = useState(0);
  const player = data.players[activePlayer];
  const buildOrder = data.buildOrders[activePlayer] || [];
  const analysis = data.gameplayAnalysis[activePlayer];

  const getRaceColor = (race: string) => {
    switch (race?.toLowerCase()) {
      case 'protoss': return 'text-yellow-500';
      case 'terran': return 'text-blue-500';
      case 'zerg': return 'text-purple-500';
      default: return 'text-muted-foreground';
    }
  };

  const getPerformanceLevel = (apm: number) => {
    if (apm >= 300) return { level: 'Pro', color: 'text-red-500', progress: 100 };
    if (apm >= 200) return { level: 'Expert', color: 'text-orange-500', progress: 80 };
    if (apm >= 120) return { level: 'Advanced', color: 'text-yellow-500', progress: 60 };
    if (apm >= 80) return { level: 'Intermediate', color: 'text-green-500', progress: 40 };
    return { level: 'Beginner', color: 'text-blue-500', progress: 20 };
  };

  const performance = getPerformanceLevel(player?.apm || 0);

  return (
    <div className="space-y-6">
      {/* Header with Game Overview */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-xl border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{data.header.mapName}</h1>
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{data.header.duration}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{data.players.length} Spieler</span>
              </div>
              <Badge variant="outline" className="bg-background">
                {data.dataQuality.reliability.toUpperCase()} Quality
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Teilen
            </Button>
          </div>
        </div>
      </div>

      {/* Player Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.players.map((p, index) => (
          <Card 
            key={index} 
            className={`cursor-pointer transition-all hover:shadow-md ${
              index === activePlayer ? 'ring-2 ring-primary bg-primary/5' : ''
            }`}
            onClick={() => setActivePlayer(index)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{p.name}</h3>
                    <span className={`text-sm font-medium ${getRaceColor(p.race)}`}>
                      {p.race}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{p.apm} APM</span>
                    <span>{p.eapm} EAPM</span>
                    <span>{p.efficiency}% Eff</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${getPerformanceLevel(p.apm).color}`}>
                    {getPerformanceLevel(p.apm).level}
                  </div>
                  <ChevronRight className={`h-4 w-4 transition-transform ${
                    index === activePlayer ? 'rotate-90' : ''
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Analysis Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="buildorder">Build Order</TabsTrigger>
          <TabsTrigger value="micro">Micro</TabsTrigger>
          <TabsTrigger value="improvement">Verbesserung</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Performance Level */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="h-5 w-5" />
                  Skill Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className={`text-3xl font-bold mb-2 ${performance.color}`}>
                    {performance.level}
                  </div>
                  <Progress value={performance.progress} className="mb-2" />
                  <div className="text-sm text-muted-foreground">
                    {player?.apm} APM • {player?.eapm} EAPM
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Playstyle */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Brain className="h-5 w-5" />
                  Spielstil
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <Badge variant="secondary" className="text-lg px-4 py-2 mb-3">
                    {analysis?.playstyle || 'Balanced'}
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    Strategischer Fokus
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Economic Efficiency */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5" />
                  Wirtschaft
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">
                    {analysis?.economicEfficiency || 75}%
                  </div>
                  <Progress value={analysis?.economicEfficiency || 75} className="mb-2" />
                  <div className="text-sm text-muted-foreground">
                    Effizienz Rating
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* APM Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                APM Breakdown - {player?.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">
                    {analysis?.apmBreakdown?.economic || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Economic</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">
                    {analysis?.apmBreakdown?.micro || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Micro</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-500">
                    {analysis?.apmBreakdown?.selection || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Selection</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-500">
                    {analysis?.apmBreakdown?.spam || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Spam</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {analysis?.apmBreakdown?.effective || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Effective</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <Star className="h-5 w-5" />
                  Stärken
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(analysis?.strengths || []).map((strength: string, i: number) => (
                    <li key={i} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      {strength}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <Target className="h-5 w-5" />
                  Schwächen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(analysis?.weaknesses || []).map((weakness: string, i: number) => (
                    <li key={i} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      {weakness}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Build Order Tab */}
        <TabsContent value="buildorder" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Build Order - {player?.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {buildOrder.slice(0, 15).map((entry: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{entry.action} {entry.unitName}</div>
                        <div className="text-sm text-muted-foreground">{entry.time}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{entry.supply}</div>
                      <Badge variant="outline" className="text-xs">
                        {entry.category}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Micro Tab */}
        <TabsContent value="micro" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sword className="h-5 w-5" />
                Micro Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(analysis?.microEvents || []).map((event: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <div className="font-medium capitalize">{event.action}</div>
                        <div className="text-sm text-muted-foreground">{event.time}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: event.intensity }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-current text-yellow-500" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Improvement Tab */}
        <TabsContent value="improvement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <TrendingUp className="h-5 w-5" />
                Verbesserungsempfehlungen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(analysis?.recommendations || []).map((rec: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{rec}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Nächste Schritte zum Pro Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 border-l-4 border-primary bg-primary/5">
                  <div className="font-medium">APM Ziel: {Math.min(player?.apm + 50, 400)}</div>
                  <div className="text-sm text-muted-foreground">
                    Erhöhe deine APM durch Build Order Training
                  </div>
                </div>
                <div className="p-3 border-l-4 border-green-500 bg-green-50 dark:bg-green-950/30">
                  <div className="font-medium">Efficiency Ziel: {Math.min((player?.efficiency || 0) + 10, 95)}%</div>
                  <div className="text-sm text-muted-foreground">
                    Reduziere Spam-Clicks und fokussiere auf effektive Aktionen
                  </div>
                </div>
                <div className="p-3 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/30">
                  <div className="font-medium">Micro Training</div>
                  <div className="text-sm text-muted-foreground">
                    Verbessere Einheiten-Kontrolle in kritischen Situationen
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProAnalysisDashboard;