
import React from 'react';
import { cn } from '@/lib/utils';

interface BlizzardNavTabsProps {
  tabs: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
  }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

const BlizzardNavTabs: React.FC<BlizzardNavTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className,
}) => {
  return (
    <div className={cn("relative mt-6 mb-4 sc-metal-frame", className)}>
      {/* Tab container */}
      <div className="flex items-center justify-center bg-black/60">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                // Base styles
                "relative px-8 py-3 text-sm font-medium transition-all duration-300 border-b-2 sc-terminal-text uppercase",
                // Hover and focus styles
                "hover:bg-secondary/20 focus:outline-none",
                // Active state styles
                isActive ? "text-green-400 border-b-green-500/80" : 
                          "text-muted-foreground hover:text-green-200 border-b-transparent",
                // Bottom indicator style for active state
                "after:transition-opacity after:duration-300"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                {tab.icon && (
                  <span className={cn(
                    "transition-colors",
                    isActive ? "text-green-400" : "text-muted-foreground"
                  )}>
                    {tab.icon}
                  </span>
                )}
                <span>{tab.label}</span>
              </div>
              
              {/* Active tab effect */}
              {isActive && (
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-green-900/20 to-transparent"></div>
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Border bottom accent */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-green-500/50 to-transparent"></div>
    </div>
  );
};

export default BlizzardNavTabs;
