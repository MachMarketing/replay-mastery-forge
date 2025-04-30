
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

interface EmptyReplaysStateProps {
  isFiltered: boolean;
}

const EmptyReplaysState: React.FC<EmptyReplaysStateProps> = ({ isFiltered }) => {
  return (
    <div className="text-center py-12 bg-secondary/20 rounded-lg border border-border">
      <p className="text-xl font-medium mb-2">No replays found</p>
      <p className="text-muted-foreground mb-6">
        {isFiltered
          ? 'Try adjusting your filters or search query'
          : 'Upload your first replay to get started'}
      </p>
      {!isFiltered && (
        <Button asChild>
          <Link to="/upload" className="flex items-center gap-2">
            <Upload size={18} />
            Upload New Replay
          </Link>
        </Button>
      )}
    </div>
  );
};

export default EmptyReplaysState;
