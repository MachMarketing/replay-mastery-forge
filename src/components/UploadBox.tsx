import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { parseReplay } from '@/services/replayParser';
import { ParsedReplayData } from '@/services/replayParser/types';

interface UploadBoxProps {
  onUploadComplete: (file: File, data: ParsedReplayData) => void;
}

const UploadBox: React.FC<UploadBoxProps> = ({ onUploadComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    console.log('[UploadBox] === NEUER UPLOAD VERSUCH ===');
    console.log('[UploadBox] File:', file.name, 'Size:', file.size);
    setIsUploading(true);

    try {
      // DIREKT die neue parseReplay-Funktion verwenden
      console.log('[UploadBox] Calling parseReplay...');
      const parsedData = await parseReplay(file);
      
      console.log('[UploadBox] === EMPFANGENE DATEN ===');
      console.log('[UploadBox] Primary Player:', parsedData.primaryPlayer.name);
      console.log('[UploadBox] Secondary Player:', parsedData.secondaryPlayer.name);
      console.log('[UploadBox] Primary APM:', parsedData.primaryPlayer.apm);
      console.log('[UploadBox] Secondary APM:', parsedData.secondaryPlayer.apm);
      
      toast({
        title: "Replay erfolgreich analysiert!",
        description: `Spiel zwischen ${parsedData.primaryPlayer.name} und ${parsedData.secondaryPlayer.name}`,
      });

      onUploadComplete(file, parsedData);
    } catch (error) {
      console.error('[UploadBox] FEHLER beim Upload:', error);
      toast({
        title: "Fehler beim Analysieren",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [onUploadComplete, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/octet-stream': ['.rep'],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${isUploading ? 'pointer-events-none opacity-50' : 'hover:border-primary hover:bg-primary/5'}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          {isUploading ? (
            <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
          ) : (
            <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
          )}
          
          <div>
            <h3 className="text-lg font-semibold mb-2">
              {isUploading ? 'Analysiere Replay...' : 'Replay hochladen'}
            </h3>
            
            {isUploading ? (
              <p className="text-muted-foreground">
                Parsing läuft... Dies kann einige Sekunden dauern.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  {isDragActive 
                    ? 'Datei hier ablegen...' 
                    : 'Ziehe deine .rep Datei hierher oder klicke zum Auswählen'
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  Unterstützt: StarCraft: Brood War (.rep)
                </p>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>Max. 10MB</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadBox;
