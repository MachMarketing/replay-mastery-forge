
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
      {/* Main tab container */}
      <div className="sc-metal-frame">
        <div className="flex border-b border-green-900/50">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={cn(
                  // Base styles
                  "sc-terminal-text relative py-3 px-5 border-b-2 text-center",
                  "text-sm uppercase tracking-wider transition-all",
                  "focus:outline-none",
                  // Conditional styles
                  isActive
                    ? "text-green-400 border-b-green-500"
                    : "text-gray-400 border-b-transparent hover:bg-black/30 hover:text-green-300"
                )}
              >
                {/* Icon with glow effect when active */}
                <span className={cn(
                  "mr-2",
                  isActive ? "text-green-400" : "text-gray-400"
                )}>
                  {tab.icon}
                </span>
                
                {/* Label text */}
                <span>{tab.label}</span>
                
                {/* Active state has subtle scan animation */}
                {isActive && (
                  <div className="absolute inset-0 bg-green-900/20 pointer-events-none overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-green-500/10 to-transparent 
                      animate-[scan_2s_linear_infinite] opacity-30"></div>
                  </div>
                )}
              </button>
            );
          })}
          
          {/* Active tab indicator animation */}
          <div 
            className="absolute bottom-0 h-0.5 bg-green-500 transition-all duration-300 ease-in-out"
            style={{
              left: `${(tabs.findIndex(t => t.id === activeTab) * 100) / tabs.length}%`,
              width: `${100 / tabs.length}%`,
              boxShadow: '0 0 8px rgba(34,197,94,0.5)'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default BlizzardTabNav;
