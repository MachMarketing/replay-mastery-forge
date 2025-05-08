
import React from 'react';
import { cn } from '@/lib/utils';
import { FileText, BarChart2, FlaskConical, Map } from 'lucide-react';

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface BlizzardTabNavProps {
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

const BlizzardTabNav: React.FC<BlizzardTabNavProps> = ({
  activeTab,
  onChange,
  className,
}) => {
  const tabs: TabItem[] = [
    {
      id: 'overview',
      label: 'Übersicht',
      icon: <FileText className="h-4 w-4" />,
    },
    {
      id: 'buildOrder',
      label: 'Build Order',
      icon: <BarChart2 className="h-4 w-4" />,
    },
    {
      id: 'analysis',
      label: 'Analyse',
      icon: <FlaskConical className="h-4 w-4" />,
    },
    {
      id: 'map',
      label: 'Map',
      icon: <Map className="h-4 w-4" />,
    },
  ];

  return (
    <div className={cn("relative mb-6", className)}>
      {/* Ambient background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-[1px]">
          <div className="h-full w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[1px]">
          <div className="h-full w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
        </div>
      </div>
      
      {/* Main tab container */}
      <div className="sc-metal-frame relative">
        <div className="flex flex-wrap">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={cn(
                  // Base styles - using SC terminal text for that awesome game feel
                  "sc-terminal-text relative flex items-center justify-center gap-2 px-6 py-3",
                  "text-sm uppercase tracking-wider transition-all duration-300",
                  "focus:outline-none",
                  // Conditional styles
                  isActive
                    ? "text-primary font-medium after:opacity-100"
                    : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/30 after:opacity-0"
                )}
              >
                {/* Icon with glow effect when active */}
                <span className={cn(
                  "transition-all duration-300",
                  isActive ? "text-primary" : "text-gray-400"
                )}>
                  {tab.icon}
                </span>
                
                {/* Label text */}
                <span>{tab.label}</span>
                
                {/* Bottom indicator line with animation */}
                <div
                  className={cn(
                    "absolute bottom-0 left-0 right-0 h-[2px]",
                    "bg-gradient-to-r from-transparent via-primary to-transparent",
                    "transform transition-opacity duration-300",
                    isActive ? "opacity-100" : "opacity-0"
                  )}
                ></div>
                
                {/* Active state has subtle scan animation */}
                {isActive && (
                  <div className="absolute inset-0 bg-primary/5 pointer-events-none overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent 
                      animate-[scan_2s_linear_infinite] opacity-20"></div>
                  </div>
                )}
              </button>
            );
          })}
          
          {/* Active tab indicator animation */}
          <div 
            className="absolute bottom-0 h-0.5 bg-primary transition-all duration-300 ease-in-out"
            style={{
              left: `${(tabs.findIndex(t => t.id === activeTab) * 100) / tabs.length}%`,
              width: `${100 / tabs.length}%`,
              boxShadow: '0 0 8px rgba(37,99,235,0.5)'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default BlizzardTabNav;
