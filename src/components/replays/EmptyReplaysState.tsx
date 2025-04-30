
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Upload, FilterX } from 'lucide-react';

interface EmptyReplaysStateProps {
  isFiltered: boolean;
  onClearFilters?: () => void;
}

const EmptyReplaysState: React.FC<EmptyReplaysStateProps> = ({ isFiltered, onClearFilters }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 bg-secondary/10 rounded-lg border border-border">
      <div className="bg-primary/10 p-4 rounded-full mb-6">
        {isFiltered ? (
          <FilterX size={32} className="text-primary" />
        ) : (
          <Upload size={32} className="text-primary" />
        )}
      </div>
      
      <h3 className="text-2xl font-semibold mb-2">
        {isFiltered ? 'No matches found' : 'No replays yet'}
      </h3>
      
      <p className="text-muted-foreground mb-8 text-center max-w-md">
        {isFiltered
          ? 'Try adjusting your filters or search query to find what you\'re looking for.'
          : 'Upload your first replay file to analyze your gameplay and improve your skills.'}
      </p>
      
      {isFiltered ? (
        <Button onClick={onClearFilters} variant="outline" className="flex items-center gap-2">
          <FilterX size={18} />
          Clear All Filters
        </Button>
      ) : (
        <Button asChild>
          <Link to="/upload" className="flex items-center gap-2">
            <Upload size={18} />
            Upload Your First Replay
          </Link>
        </Button>
      )}
    </div>
  );
};

export default EmptyReplaysState;
