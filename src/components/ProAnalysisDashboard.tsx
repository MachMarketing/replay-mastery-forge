
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Trophy, 
  Zap, 
  Target, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Map,
  Users,
  Activity,
  Brain,
  Star
} from 'lucide-react';

interface ProAnalysisDashboardProps {
  data: any;
}

const ProAnalysisDashboard: React.FC<ProAnalysisDashboardProps> = ({ data }) => {
  if (!data?.data?.analysis) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">No professional analysis data available</p>
        </CardContent>
      </Card>
    );
  }

  const { data: analysisData } = data;
  const { analysis, map_name, duration, parsing_stats } = analysisData;
  
  // Get first player for detailed analysis
  const firstPlayerId = Object.keys(analysis)[0];
  const playerAnalysis = analysis[firstPlayerId];

  const getRaceColor = (race: string) => {
    const colors = {
      'Terran': 'from-blue-500 to-blue-600',
      'Protoss': 'from-yellow-500 to-yellow-600', 
      'Zerg': 'from-purple-500 to-purple-600'
    };
    return colors[race as keyof typeof colors] || 'from-gray-500 to-gray-600';
  };

  const calculateOverallScore = (player: any): number => {
    let score = 0;
    
    // APM scoring (0-40 points)
    score += Math.min(40, (player.apm / 200) * 40);
    
    // EAPM scoring (0-30 points)  
    score += Math.min(30, (player.eapm / 150) * 30);
    
    // Build efficiency (0-20 points)
    score += (player.build_analysis?.efficiency || 0) * 0.2;
    
    // Bonus for strengths (0-10 points)
    score += Math.min(10, player.strengths?.length * 2);
    
    return Math.round(score);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 90) return 'Elite';
    if (score >= 80) return 'Expert';
    if (score >= 70) return 'Advanced';
    if (score >= 60) return 'Intermediate';
    if (score >= 40) return 'Beginner';
    return 'Learning';
  };

  const overallScore = calculateOverallScore(playerAnalysis);

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className={`bg-gradient-to-r ${getRaceColor(playerAnalysis.race)} text-white`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">{playerAnalysis.player_name}</h2>
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {playerAnalysis.race}
                </Badge>
                <div className="flex items-center gap-2">
                  <Map className="h-4 w-4" />
                  <span>{map_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{duration}</span>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">{overallScore}</div>
              <div className="text-sm opacity-90">{getScoreLabel(overallScore)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Zap className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{playerAnalysis.apm}</div>
                <div className="text-sm text-muted-foreground">Actions per Minute</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{playerAnalysis.eapm}</div>
                <div className="text-sm text-muted-foreground">Effective APM</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{playerAnalysis.build_analysis?.efficiency || 0}%</div>
                <div className="text-sm text-muted-foreground">Build Efficiency</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Brain className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{parsing_stats?.commands_parsed || 0}</div>
                <div className="text-sm text-muted-foreground">Commands Analyzed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Radar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* APM Analysis */}
            <div>
              <h4 className="font-semibold mb-3">Action Speed</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>APM Rating</span>
                  <span className="font-mono">{playerAnalysis.apm}</span>
                </div>
                <Progress value={Math.min(100, (playerAnalysis.apm / 200) * 100)} />
                <p className="text-xs text-muted-foreground">
                  {playerAnalysis.apm < 80 ? 'Focus on faster execution' : 
                   playerAnalysis.apm < 150 ? 'Good macro speed' : 'Excellent action speed'}
                </p>
              </div>
            </div>

            {/* Efficiency Analysis */}
            <div>
              <h4 className="font-semibold mb-3">Action Efficiency</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>EAPM Rating</span>
                  <span className="font-mono">{playerAnalysis.eapm}</span>
                </div>
                <Progress value={Math.min(100, (playerAnalysis.eapm / 150) * 100)} />
                <p className="text-xs text-muted-foreground">
                  {playerAnalysis.eapm < 60 ? 'Reduce spam clicking' : 
                   playerAnalysis.eapm < 100 ? 'Good efficiency' : 'Highly efficient'}
                </p>
              </div>
            </div>

            {/* Build Analysis */}
            <div>
              <h4 className="font-semibold mb-3">Build Order</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Strategy</span>
                  <Badge variant="outline">{playerAnalysis.build_analysis?.strategy}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Timing</span>
                  <Badge variant="outline">{playerAnalysis.build_analysis?.timing}</Badge>
                </div>
                <Progress value={playerAnalysis.build_analysis?.efficiency || 0} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Build Order */}
      <Card>
        <CardHeader>
          <CardTitle>Professional Build Order</CardTitle>
          <CardDescription>
            First 15 actions - optimized for {playerAnalysis.race} gameplay
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {playerAnalysis.build_order?.slice(0, 15).map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-primary/10 px-2 py-1 rounded">
                      {item.timestamp}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {item.supply}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">{item.unitName}</span>
                    <div className="text-xs text-muted-foreground">
                      {item.action} • {item.category}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono">
                    {item.cost.minerals}m {item.cost.gas > 0 && `${item.cost.gas}g`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Coaching */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {playerAnalysis.strengths?.map((strength: string, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <Trophy className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-green-900">{strength}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Improvement Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {playerAnalysis.weaknesses?.map((weakness: string, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-orange-900">{weakness}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            AI Coaching Recommendations
          </CardTitle>
          <CardDescription>
            Personalized training plan based on your gameplay analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {playerAnalysis.recommendations?.map((rec: string, index: number) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-900 font-medium">{rec}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProAnalysisDashboard;
