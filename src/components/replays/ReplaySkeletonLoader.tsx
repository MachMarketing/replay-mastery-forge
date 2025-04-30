
import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

const ReplaySkeletonLoader: React.FC = () => {
  return (
    <Card className="p-4 overflow-hidden">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="space-y-2 w-full">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-16 ml-auto md:ml-2" />
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-y-1 sm:gap-x-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
        
        <div className="flex items-center gap-4 border-t pt-3 mt-2 md:border-t-0 md:pt-0 md:mt-0">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </Card>
  );
};

export default ReplaySkeletonLoader;
