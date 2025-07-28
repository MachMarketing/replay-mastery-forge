
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

  // If no player analysis found, show Korean Pro Parser status
  if (!playerAnalysis || !firstPlayerId) {
    return (
      <div className="space-y-6">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <span className="text-lg font-semibold text-amber-800">🇰🇷 Korean Professional Parser</span>
            </div>
            <p className="text-amber-700 mb-2">Using industry-standard icza/screp parser</p>
            <p className="text-sm text-amber-600">Same technology used by Korean esports professionals</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">Analysis data is being processed...</p>
            <p className="text-sm text-muted-foreground mt-1">Korean professional parsing in progress</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getRaceColor = (race: string) => {
    const colors = {
      'Terran': 'from-terran to-terran/80',
      'Protoss': 'from-protoss to-protoss/80', 
      'Zerg': 'from-zerg to-zerg/80'
    };
    return colors[race as keyof typeof colors] || 'from-primary to-primary/80';
  };

  const calculateOverallScore = (player: any): number => {
    let score = 0;
    
    // APM scoring (0-40 points)
    score += Math.min(40, ((player?.apm || 0) / 200) * 40);
    
    // EAPM scoring (0-30 points)  
    score += Math.min(30, ((player?.eapm || 0) / 150) * 30);
    
    // Build efficiency (0-20 points)
    score += (player?.build_analysis?.efficiency || 0) * 0.2;
    
    // Bonus for strengths (0-10 points)
    score += Math.min(10, (player?.strengths?.length || 0) * 2);
    
    return Math.round(score);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-strength';
    if (score >= 60) return 'text-improvement';
    return 'text-weakness';
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
      <Card className={`bg-gradient-to-r ${getRaceColor(playerAnalysis.race)} text-primary-foreground border-none`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-primary-foreground">{playerAnalysis.player_name}</h2>
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
                  {playerAnalysis.race}
                </Badge>
                <div className="flex items-center gap-2 text-primary-foreground">
                  <Map className="h-4 w-4" />
                  <span>{map_name}</span>
                </div>
                <div className="flex items-center gap-2 text-primary-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{duration}</span>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-1 text-primary-foreground">{overallScore}</div>
              <div className="text-sm opacity-90 text-primary-foreground">{getScoreLabel(overallScore)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-improvement/20 rounded-lg border border-improvement/30">
                <Zap className="h-5 w-5 text-improvement" />
              </div>
              <div>
                <div className="text-2xl font-bold text-card-foreground">{playerAnalysis.apm}</div>
                <div className="text-sm text-muted-foreground">Actions per Minute</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-strength/20 rounded-lg border border-strength/30">
                <Target className="h-5 w-5 text-strength" />
              </div>
              <div>
                <div className="text-2xl font-bold text-card-foreground">{playerAnalysis.eapm}</div>
                <div className="text-sm text-muted-foreground">Effective APM</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg border border-primary/30">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-card-foreground">{playerAnalysis.build_analysis?.efficiency || 0}%</div>
                <div className="text-sm text-muted-foreground">Build Efficiency</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/20 rounded-lg border border-accent/30">
                <Brain className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-card-foreground">{parsing_stats?.commands_parsed || 0}</div>
                <div className="text-sm text-muted-foreground">Commands Analyzed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Radar */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <Star className="h-5 w-5 text-primary" />
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* APM Analysis */}
            <div>
              <h4 className="font-semibold mb-3 text-card-foreground">Action Speed</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-card-foreground">APM Rating</span>
                  <span className="font-mono text-improvement">{playerAnalysis.apm}</span>
                </div>
                <Progress value={Math.min(100, (playerAnalysis.apm / 200) * 100)} className="bg-muted" />
                <p className="text-xs text-muted-foreground">
                  {playerAnalysis.apm < 80 ? 'Focus on faster execution' : 
                   playerAnalysis.apm < 150 ? 'Good macro speed' : 'Excellent action speed'}
                </p>
              </div>
            </div>

            {/* Efficiency Analysis */}
            <div>
              <h4 className="font-semibold mb-3 text-card-foreground">Action Efficiency</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-card-foreground">EAPM Rating</span>
                  <span className="font-mono text-strength">{playerAnalysis.eapm}</span>
                </div>
                <Progress value={Math.min(100, (playerAnalysis.eapm / 150) * 100)} className="bg-muted" />
                <p className="text-xs text-muted-foreground">
                  {playerAnalysis.eapm < 60 ? 'Reduce spam clicking' : 
                   playerAnalysis.eapm < 100 ? 'Good efficiency' : 'Highly efficient'}
                </p>
              </div>
            </div>

            {/* Build Analysis */}
            <div>
              <h4 className="font-semibold mb-3 text-card-foreground">Build Order</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-card-foreground">Strategy</span>
                  <Badge variant="outline" className="border-border text-card-foreground">{playerAnalysis.build_analysis?.strategy}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-card-foreground">Timing</span>
                  <Badge variant="outline" className="border-border text-card-foreground">{playerAnalysis.build_analysis?.timing}</Badge>
                </div>
                <Progress value={playerAnalysis.build_analysis?.efficiency || 0} className="bg-muted" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Build Order */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground">Professional Build Order</CardTitle>
          <CardDescription className="text-muted-foreground">
            First 15 actions - optimized for {playerAnalysis.race} gameplay
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {playerAnalysis.build_order?.slice(0, 15).map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-primary/20 text-primary px-2 py-1 rounded border border-primary/30">
                      {item.timestamp}
                    </span>
                    <Badge variant="outline" className="text-xs border-border text-card-foreground">
                      {item.supply}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium text-card-foreground">{item.unitName}</span>
                    <div className="text-xs text-muted-foreground">
                      {item.action} • {item.category}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-card-foreground">
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
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-strength">
              <CheckCircle className="h-5 w-5" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {playerAnalysis.strengths?.map((strength: string, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-strength/10 rounded-lg border border-strength/20">
                  <Trophy className="h-4 w-4 text-strength mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-card-foreground">{strength}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-weakness">
              <AlertTriangle className="h-5 w-5" />
              Improvement Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {playerAnalysis.weaknesses?.map((weakness: string, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-weakness/10 rounded-lg border border-weakness/20">
                  <AlertTriangle className="h-4 w-4 text-weakness mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-card-foreground">{weakness}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Recommendations */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <Brain className="h-5 w-5 text-primary" />
            AI Coaching Recommendations
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Personalized training plan based on your gameplay analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {playerAnalysis.recommendations?.map((rec: string, index: number) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-primary/10 rounded-lg border-l-4 border-primary">
                <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-card-foreground font-medium">{rec}</p>
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
