import React, { useState } from 'react';
import { useEnhancedReplayParser, type EnhancedReplayData } from '@/hooks/useEnhancedReplayParser';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import UploadBox from '@/components/UploadBox';
import ProAnalysisDashboard from '@/components/analysis/ProAnalysisDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Trophy,
  Target,
  Zap,
  Clock,
  TrendingUp,
  Users,
  Gamepad2,
  BarChart3,
  Brain,
  Star
} from 'lucide-react';

const UploadPage: React.FC = () => {
  const [analysisData, setAnalysisData] = useState<EnhancedReplayData | null>(null);
  const { parseReplay, isLoading } = useEnhancedReplayParser();

  const handleUploadComplete = async (file: File) => {
    console.log('[UploadPage] Starting professional SC:R analysis for:', file.name);
    
    const result = await parseReplay(file);
    
    console.log('[UploadPage] Professional analysis result:', {
      success: result.success,
      playerName: result.playerName,
      playerRace: result.playerRace,
      opponentName: result.opponentName,
      opponentRace: result.opponentRace,
      mapName: result.mapName,
      apm: result.apm,
      buildOrderLength: result.buildOrder.length
    });
    
    setAnalysisData(result);
  };

  const features = [
    {
      icon: Brain,
      title: "KI-gestützte Analyse",
      description: "Professionelle Gameplay-Analyse mit konkreten Verbesserungsvorschlägen"
    },
    {
      icon: Target,
      title: "Perfekte Build Orders",
      description: "Detaillierte Timing-Analyse und Optimierungsvorschläge"
    },
    {
      icon: BarChart3,
      title: "Performance Metrics",
      description: "APM, EAPM, Effizienz und alle wichtigen Statistiken"
    },
    {
      icon: TrendingUp,
      title: "Ladder Verbesserung",
      description: "Spezifische Tipps für deinen Skill-Level und deine Rasse"
    }
  ];

  if (!analysisData) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
          <div className="container mx-auto px-4 py-8 mt-16">
            <div className="max-w-6xl mx-auto">
              
              {/* Hero Section */}
              <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-r from-primary to-primary/70 rounded-xl">
                    <Gamepad2 className="h-8 w-8 text-white" />
                  </div>
                  <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                    SC:R Pro Analyzer
                  </h1>
                </div>
                
                <p className="text-xl text-muted-foreground mb-2 max-w-3xl mx-auto">
                  Von Beginner zu Pro • Echte SC:R Datenanalyse • KI-gestützte Verbesserungen
                </p>
                <p className="text-lg text-muted-foreground/80 mb-8">
                  Analysiere deine StarCraft: Remastered Replays und verbessere dein Ladder-Spiel
                </p>

                <div className="flex items-center justify-center gap-6 mb-8">
                  <Badge variant="secondary" className="px-4 py-2 text-sm">
                    <Trophy className="h-4 w-4 mr-2" />
                    Profi-Level Analyse
                  </Badge>
                  <Badge variant="secondary" className="px-4 py-2 text-sm">
                    <Zap className="h-4 w-4 mr-2" />
                    Sofortige Ergebnisse
                  </Badge>
                  <Badge variant="secondary" className="px-4 py-2 text-sm">
                    <Users className="h-4 w-4 mr-2" />
                    Für alle Skill-Level
                  </Badge>
                </div>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {features.map((feature, index) => (
                  <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-muted/50 hover:border-primary/30">
                    <CardContent className="p-6 text-center">
                      <div className="p-3 bg-primary/10 rounded-lg w-fit mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-2 text-sm">{feature.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Upload Section */}
              <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="flex items-center justify-center gap-3 text-2xl">
                    <Star className="h-6 w-6 text-primary" />
                    Replay hochladen & analysieren
                  </CardTitle>
                  <CardDescription className="text-base">
                    Lade deine .rep Datei hoch und erhalte sofort eine professionelle Analyse
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UploadBox onUploadComplete={handleUploadComplete} isLoading={isLoading} />
                </CardContent>
              </Card>

              {/* How it Works */}
              <div className="mt-16">
                <h2 className="text-3xl font-bold text-center mb-8">So funktioniert's</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="text-center">
                    <div className="p-4 bg-primary rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">1</span>
                    </div>
                    <h3 className="font-semibold mb-2">Upload Replay</h3>
                    <p className="text-muted-foreground text-sm">
                      Ziehe deine .rep Datei in den Upload-Bereich oder klicke zum Auswählen
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="p-4 bg-primary rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">2</span>
                    </div>
                    <h3 className="font-semibold mb-2">KI-Analyse</h3>
                    <p className="text-muted-foreground text-sm">
                      Unser fortschrittlicher Parser analysiert jede Aktion in deinem Spiel
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="p-4 bg-primary rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">3</span>
                    </div>
                    <h3 className="font-semibold mb-2">Verbessere dich</h3>
                    <p className="text-muted-foreground text-sm">
                      Erhalte konkrete Tipps und Strategien für dein nächstes Ladder-Spiel
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview Results */}
              <div className="mt-16 text-center">
                <h2 className="text-3xl font-bold mb-8">Was du erhältst</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card className="p-6">
                    <Clock className="h-8 w-8 text-primary mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Build Order Timing</h3>
                    <p className="text-sm text-muted-foreground">
                      Perfekte Timing-Analyse für jeden Build-Schritt
                    </p>
                  </Card>
                  <Card className="p-6">
                    <Target className="h-8 w-8 text-primary mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Effizienz-Score</h3>
                    <p className="text-sm text-muted-foreground">
                      APM, EAPM und Ressourcen-Management bewertet
                    </p>
                  </Card>
                  <Card className="p-6">
                    <TrendingUp className="h-8 w-8 text-primary mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Konkrete Tipps</h3>
                    <p className="text-sm text-muted-foreground">
                      Spezifische Verbesserungsvorschläge für dein Level
                    </p>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8 mt-16">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Profi-Analyse Ergebnis
              </h1>
              <p className="text-muted-foreground mt-2">
                Deine SC:R Replay wurde erfolgreich analysiert
              </p>
            </div>
            <Button 
              onClick={() => setAnalysisData(null)}
              variant="outline"
              className="text-primary border-primary hover:bg-primary hover:text-white"
            >
              ← Neue Replay analysieren
            </Button>
          </div>
          
          <ProAnalysisDashboard data={analysisData} />
        </div>
      </div>
      <Footer />
    </>
  );
};

export default UploadPage;