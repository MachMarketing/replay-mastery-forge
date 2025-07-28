import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface KoreanProAnalysisProps {
  analysis: any;
  parsingStats: any;
}

export const KoreanProAnalysis: React.FC<KoreanProAnalysisProps> = ({ 
  analysis, 
  parsingStats 
}) => {
  const firstPlayerId = Object.keys(analysis)[0];
  const playerData = analysis[firstPlayerId];

  if (!playerData) {
    return (
      <Card className="border-improvement/30 bg-gradient-to-r from-improvement/10 to-improvement/5">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-3 h-3 bg-improvement rounded-full animate-pulse"></div>
            <span className="text-lg font-bold text-card-foreground">🇰🇷 Korean Professional Parser</span>
          </div>
          <p className="text-card-foreground font-medium">Using icza/screp - Industry Standard</p>
          <p className="text-sm text-muted-foreground mt-1">Same technology used by Korean esports professionals</p>
          <div className="mt-4 w-full bg-muted rounded-full h-2">
            <div className="bg-improvement h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Professional parsing in progress...</p>
        </CardContent>
      </Card>
    );
  }

  const skillLevel = playerData.skill_level || 'Analyzing...';
  const overallScore = playerData.overall_score || 0;
  
  const getSkillColor = (level: string) => {
    switch (level) {
      case 'Professional': return 'from-zerg to-zerg/80';
      case 'Advanced': return 'from-terran to-terran/80';
      case 'Intermediate': return 'from-strength to-strength/80';
      case 'Beginner': return 'from-improvement to-improvement/80';
      default: return 'from-muted to-muted/80';
    }
  };

  return (
    <div className="space-y-6">
      {/* Korean Parser Status */}
      <Card className="border-strength/30 bg-gradient-to-r from-strength/10 to-strength/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-strength rounded-full"></div>
              <div>
                <p className="font-bold text-card-foreground">🇰🇷 Korean Professional Parser</p>
                <p className="text-sm text-muted-foreground">icza/screp - Industry Standard</p>
              </div>
            </div>
            <Badge className="bg-strength/20 text-strength border-strength/30">
              ✓ Professional Quality
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Professional Skill Assessment */}
      <Card className={`bg-gradient-to-r ${getSkillColor(skillLevel)} text-primary-foreground border-none`}>
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-primary-foreground">
            Professional Skill Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-6xl font-bold mb-2 text-primary-foreground">{overallScore}</div>
          <div className="text-xl font-semibold mb-4 text-primary-foreground">{skillLevel}</div>
          <Progress value={overallScore} className="w-full h-3 bg-primary-foreground/20" />
          <p className="mt-2 text-sm opacity-90 text-primary-foreground">Korean Professional Standards</p>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg text-card-foreground">⚡ Actions Per Minute</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-improvement mb-2">
              {playerData.apm || 0}
            </div>
            <p className="text-sm text-muted-foreground">Total APM</p>
            <div className="mt-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-card-foreground">Effective APM</span>
                <span className="font-semibold text-strength">{playerData.eapm || 0}</span>
              </div>
              <Progress value={(playerData.eapm / Math.max(playerData.apm, 1)) * 100} className="bg-muted" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg text-card-foreground">🏗️ Build Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-card-foreground">Strategy:</span>
                <Badge variant="outline" className="border-border text-card-foreground">{playerData.build_analysis?.strategy || 'Unknown'}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-card-foreground">Efficiency:</span>
                <span className="font-semibold text-primary">{playerData.build_analysis?.efficiency || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-card-foreground">Worker Count:</span>
                <span className="font-semibold text-primary">{playerData.build_analysis?.worker_count || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg text-strength">💪 Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(playerData.strengths || []).map((strength: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-strength text-sm">✓</span>
                  <span className="text-sm text-card-foreground">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg text-improvement">⚠️ Areas to Improve</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(playerData.weaknesses || []).map((weakness: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-improvement text-sm">!</span>
                  <span className="text-sm text-card-foreground">{weakness}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Professional Recommendations */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg text-primary">🎯 Professional Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(playerData.recommendations || []).map((rec: string, index: number) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <span className="text-primary font-bold text-sm">{index + 1}</span>
                <span className="text-sm text-card-foreground">{rec}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Parsing Quality Indicator */}
      <Card className="bg-muted/20 border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Parser Quality:</span>
            <div className="flex items-center gap-2">
              <Badge className="bg-strength/20 text-strength border-strength/30">Korean Professional</Badge>
              <span className="text-muted-foreground">
                {parsingStats?.commands_parsed || 0} commands processed
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};