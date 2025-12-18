
import React from 'react';

interface VoiceIndicatorProps {
  isActive: boolean;
  label: string;
}

const VoiceIndicator: React.FC<VoiceIndicatorProps> = ({ isActive, label }) => {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-3 w-3">
        {isActive && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
        )}
        <span className={`relative inline-flex rounded-full h-3 w-3 ${isActive ? 'bg-blue-500' : 'bg-gray-600'}`}></span>
      </div>
      <span className="text-sm font-medium text-gray-400">{label}</span>
    </div>
  );
};

export default VoiceIndicator;
