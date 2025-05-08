
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
    <div className={cn("relative mt-6 mb-4", className)}>
      {/* Futuristic border top and bottom */}
      <div className="absolute left-0 right-0 h-[1px] top-0 bg-gradient-to-r from-transparent via-primary/60 to-transparent"></div>
      <div className="absolute left-0 right-0 h-[1px] bottom-0 bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>
      
      {/* Background glow for active indicator */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>
      
      {/* Tab container */}
      <div className="flex items-center justify-center relative">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                // Base styles
                "relative px-8 py-4 text-sm font-medium transition-all duration-300 border-t-0 border-b-0 sc-terminal-text tracking-wide uppercase",
                // Hover and focus styles
                "hover:bg-secondary/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-2",
                // Active state styles
                isActive ? "text-primary after:opacity-100 blizzard-button" : 
                          "text-muted-foreground hover:text-foreground after:opacity-0",
                // Bottom indicator style
                "after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-3/4 after:h-[2px]",
                "after:bg-gradient-to-r after:from-transparent after:via-primary after:to-transparent",
                "after:transition-opacity after:duration-300"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                {tab.icon && (
                  <span className={cn(
                    "transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}>
                    {tab.icon}
                  </span>
                )}
                <span>{tab.label}</span>
              </div>
              
              {/* Active glow effect */}
              {isActive && (
                <div className="absolute inset-0 bg-primary/5 pointer-events-none overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent 
                    animate-[ping_3s_cubic-bezier(0.4,0,0.6,1)_infinite] opacity-70"></div>
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Active tab indicator line */}
      <div className="absolute bottom-0 left-0 h-[2px] bg-primary/70"
           style={{
             width: `${100 / tabs.length}%`,
             transform: `translateX(${tabs.findIndex(t => t.id === activeTab) * 100}%)`,
             transition: 'transform 0.3s ease-in-out'
           }}
      />
    </div>
  );
};

export default BlizzardNavTabs;
