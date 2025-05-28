import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, FileText, CheckCircle, AlertCircle, RefreshCw, Search, Play } from 'lucide-react';
import { ParsedReplayData } from '@/services/replayParser/types';
import { parseReplay } from '@/services/replayParser';
import { ReplayAnalyzer, ReplayAnalysisResult } from '@/services/nativeReplayParser/replayAnalyzer';
import ReplayAnalysisDisplay from './ReplayAnalysisDisplay';

interface UploadBoxProps {
  onUploadComplete?: (file: File, replayData: ParsedReplayData) => void;
  maxFileSize?: number;
}

const UploadBox: React.FC<UploadBoxProps> = ({ onUploadComplete, maxFileSize = 10 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploaded' | 'parsing' | 'analyzing' | 'success' | 'error' | 'analysis-complete'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<ReplayAnalysisResult | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const { toast } = useToast();
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsDragging(false);
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    if (!validateFile(file)) return;
    
    // Just upload the file, don't parse it automatically
    await uploadFile(file);
  }, []);

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    accept: {
      'application/octet-stream': ['.rep']
    },
    maxSize: maxFileSize * 1024 * 1024
  });

  const validateFile = (file: File): boolean => {
    if (file.size > maxFileSize * 1024 * 1024) {
      toast({
        title: "Datei zu groß",
        description: `Maximale Dateigröße ist ${maxFileSize}MB`,
        variant: "destructive",
      });
      return false;
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'rep') {
      toast({
        title: "Ungültiger Dateityp",
        description: "Nur StarCraft Replay Dateien (.rep) sind erlaubt",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const uploadFile = async (file: File) => {
    console.log("[UploadBox] Uploading file:", file.name);
    setFile(file);
    setErrorDetails(null);
    setAnalysisResult(null);
    setShowAnalysis(false);
    setUploadStatus('uploaded');
    setStatusMessage('Datei hochgeladen - wähle Analyse-Typ');
    setProgress(100);
    
    toast({
      title: "Datei hochgeladen",
      description: `${file.name} ist bereit zur Analyse.`,
    });
  };

  const analyzeReplay = async (file: File) => {
    console.log("[UploadBox] Starting detailed analysis:", file.name);
    setUploadStatus('analyzing');
    setStatusMessage('Datei wird detailliert analysiert...');
    setProgress(0);
    
    const progressInterval = setInterval(() => {
      setProgress(prev => prev >= 90 ? 90 : prev + 10);
    }, 200);
    
    try {
      const analyzer = new ReplayAnalyzer();
      const analysis = await analyzer.analyzeReplay(file);
      
      // === DETAILED CONSOLE LOGGING FOR AI ACCESS ===
      console.log("=== DETAILANALYSE ERGEBNISSE FÜR AI ===");
      console.log("Datei:", file.name, "| Größe:", (file.size / 1024).toFixed(2), "KB");
      console.log("Format-Erkennung:");
      console.log("  - Magic Bytes:", analysis.formatDetection.magic);
      console.log("  - Komprimiert:", analysis.formatDetection.isCompressed);
      console.log("  - Format:", analysis.formatDetection.detectedFormat);
      console.log("  - Version:", analysis.formatDetection.estimatedVersion);
      
      console.log("screp-js Kompatibilität:");
      console.log("  - Verfügbar:", analysis.screpJsCompatibility.available);
      console.log("  - Parse erfolgreich:", analysis.screpJsCompatibility.parseSuccess);
      if (analysis.screpJsCompatibility.error) {
        console.log("  - Fehler:", analysis.screpJsCompatibility.error);
      }
      if (analysis.screpJsCompatibility.resultKeys) {
        console.log("  - Ergebnis Keys:", analysis.screpJsCompatibility.resultKeys.join(', '));
      }
      
      // Log extracted data if available
      if (analysis.screpJsCompatibility.extractedData) {
        const data = analysis.screpJsCompatibility.extractedData;
        console.log("screp-js Extrahierte Daten:");
        console.log("  - Map:", data.mapName);
        console.log("  - Spieler gefunden:", data.playersFound);
        console.log("  - Spieler Namen:", data.playerNames.join(', '));
        console.log("  - Dauer:", data.duration);
        console.log("  - Frames:", data.totalFrames);
        if (data.apm.length > 0) {
          console.log("  - APM:", data.apm.join(', '));
        }
      }
      
      console.log("Empfehlungen:");
      analysis.recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
      
      console.log("Erste 64 Bytes (Hex):");
      console.log(analysis.hexDump.first256Bytes.substring(0, 200) + "...");
      
      console.log("=== ENDE DETAILANALYSE ===");
      
      // Store in window for potential AI access
      (window as any).lastAnalysisResult = analysis;
      (window as any).lastAnalysisFile = file.name;
      
      clearInterval(progressInterval);
      setProgress(100);
      setAnalysisResult(analysis);
      setUploadStatus('analysis-complete');
      setStatusMessage('Analyse abgeschlossen');
      setShowAnalysis(true);
      
      toast({
        title: "Analyse abgeschlossen",
        description: `Detaillierte Analyse von ${file.name} verfügbar.`,
      });
      
    } catch (error) {
      clearInterval(progressInterval);
      console.error("[UploadBox] Analysis error:", error);
      console.log("=== ANALYSE FEHLER FÜR AI ===");
      console.log("Datei:", file.name);
      console.log("Fehler:", error instanceof Error ? error.message : 'Unbekannter Fehler');
      console.log("Stack:", error instanceof Error ? error.stack : 'Keine Stack-Trace');
      console.log("=== ENDE FEHLER ===");
      
      const errorMessage = error instanceof Error ? error.message : 'Analyse-Fehler';
      setErrorDetails(errorMessage);
      setUploadStatus('error');
      setStatusMessage('Analyse fehlgeschlagen');
      setProgress(0);
      
      toast({
        title: "Analyse fehlgeschlagen",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const processFile = async (file: File) => {
    console.log("[UploadBox] Processing file:", file.name);
    setUploadStatus('parsing');
    setStatusMessage('Replay wird analysiert...');
    setProgress(0);
    
    const progressInterval = setInterval(() => {
      setProgress(prev => prev >= 90 ? 90 : prev + 10);
    }, 300);
    
    try {
      const parsedData = await parseReplay(file);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      setUploadStatus('success');
      setStatusMessage('Analyse erfolgreich abgeschlossen!');
      
      toast({
        title: "Replay analysiert",
        description: `${file.name} wurde erfolgreich analysiert.`,
      });
      
      setTimeout(() => {
        if (onUploadComplete && parsedData) {
          onUploadComplete(file, parsedData);
        }
      }, 500);
      
    } catch (error) {
      clearInterval(progressInterval);
      console.error("[UploadBox] Error:", error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setErrorDetails(errorMessage);
      setUploadStatus('error');
      setStatusMessage('Fehler beim Analysieren');
      setProgress(0);
      
      toast({
        title: "Analyse fehlgeschlagen",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setFile(null);
    setUploadStatus('idle');
    setStatusMessage('');
    setErrorDetails(null);
    setAnalysisResult(null);
    setShowAnalysis(false);
    setProgress(0);
  };

  const handleRetry = () => {
    if (file) {
      processFile(file);
    } else {
      handleCancel();
    }
  };

  if (uploadStatus === 'idle') {
    return (
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-all ${
          isDragging 
            ? 'border-primary bg-primary/10 animate-pulse' 
            : 'border-border hover:border-primary/50 hover:bg-secondary/50'
        }`}
      >
        <div className="h-14 w-14 rounded-full flex items-center justify-center mb-4 bg-primary/20">
          <Upload className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          StarCraft Replay hochladen
        </h3>
        <p className="text-sm mb-4 text-center text-muted-foreground">
          Ziehe deine .rep Datei hierher oder klicke zum Auswählen
        </p>
        <Button onClick={open} variant="default">
          Datei auswählen
        </Button>
        <input {...getInputProps()} accept=".rep" />
        <p className="text-xs text-muted-foreground mt-4">
          Max. Dateigröße: {maxFileSize}MB | Format: .rep
        </p>
      </div>
    );
  }

  // Show analysis results if available
  if (uploadStatus === 'analysis-complete' && analysisResult && showAnalysis) {
    return (
      <div className="space-y-4">
        <ReplayAnalysisDisplay analysis={analysisResult} />
        <div className="flex gap-2">
          <Button onClick={handleCancel} variant="outline">
            Neue Datei hochladen
          </Button>
          <Button onClick={() => file && processFile(file)} variant="default">
            Normal parsen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-6 bg-card shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <FileText className="h-6 w-6 mr-3 text-primary" />
          <div className="max-w-[200px]">
            <p className="font-medium truncate" title={file?.name || ""}>
              {file?.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {file && (file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
        {(uploadStatus === 'parsing' || uploadStatus === 'analyzing') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        {uploadStatus === 'success' && (
          <CheckCircle className="h-5 w-5 text-green-500" />
        )}
        {uploadStatus === 'error' && (
          <AlertCircle className="h-5 w-5 text-destructive" />
        )}
      </div>
      
      {(uploadStatus === 'parsing' || uploadStatus === 'analyzing') && (
        <>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-1">
            <p className="text-xs text-muted-foreground">
              {statusMessage}
            </p>
            <p className="text-xs text-muted-foreground">
              {Math.round(progress)}%
            </p>
          </div>
        </>
      )}
      
      {uploadStatus === 'uploaded' && (
        <div className="mt-2">
          <p className="text-sm text-blue-500 flex items-center mb-3">
            <CheckCircle className="h-4 w-4 mr-1" />
            Datei hochgeladen - Analyse-Typ wählen
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => file && processFile(file)} className="flex items-center gap-1">
              <Play className="h-4 w-4" /> Normal analysieren
            </Button>
            <Button size="sm" variant="outline" onClick={() => file && analyzeReplay(file)} className="flex items-center gap-1">
              <Search className="h-4 w-4" /> Detailanalyse
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Normal: Spiel-Analyse | Detailanalyse: Technische Diagnose
          </p>
        </div>
      )}
      
      {uploadStatus === 'success' && (
        <div className="mt-2">
          <p className="text-sm text-green-500 flex items-center">
            <CheckCircle className="h-4 w-4 mr-1" />
            Analyse abgeschlossen
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Dein Replay wurde analysiert und ist bereit zum Anzeigen.
          </p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={() => file && analyzeReplay(file)}>
              <Search className="h-4 w-4 mr-1" /> Detailanalyse
            </Button>
          </div>
        </div>
      )}
      
      {uploadStatus === 'error' && (
        <div className="mt-4 p-4 bg-opacity-10 bg-destructive border border-destructive/40 rounded-md">
          <div className="flex items-center gap-2 text-destructive mb-1">
            <AlertCircle className="h-4 w-4" />
            <p className="font-medium">Analyse fehlgeschlagen</p>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            {errorDetails || statusMessage}
          </p>
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="outline" onClick={handleRetry}>
              <RefreshCw className="h-4 w-4 mr-1" /> Erneut versuchen
            </Button>
            <Button size="sm" variant="outline" onClick={() => file && analyzeReplay(file)}>
              <Search className="h-4 w-4 mr-1" /> Detailanalyse
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              Abbrechen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadBox;
