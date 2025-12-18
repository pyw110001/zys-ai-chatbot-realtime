
import React from 'react';
import { InteractionState } from '../types';

interface DynamicOrbProps {
  state: InteractionState;
}

const DynamicOrb: React.FC<DynamicOrbProps> = ({ state }) => {
  const renderOrb = () => {
    switch (state) {
      case 'listening':
        return (
          <div className="relative flex items-center justify-center w-32 h-32">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-400 to-green-400 rounded-full blur-xl opacity-40 orb-listening"></div>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full shadow-lg orb-listening"></div>
          </div>
        );
      case 'thinking':
        return (
          <div className="relative flex items-center justify-center w-32 h-32">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-500 to-pink-500 rounded-full blur-2xl opacity-50 orb-thinking"></div>
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full shadow-xl"></div>
          </div>
        );
      case 'speaking':
        return (
          <div className="flex items-end justify-center gap-1 h-12">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i} 
                className="w-1.5 bg-blue-500 rounded-full" 
                style={{ 
                  animation: `wave 1s ease-in-out infinite`, 
                  animationDelay: `${i * 0.1}s` 
                }}
              />
            ))}
          </div>
        );
      case 'error':
        return (
          <div className="w-16 h-16 bg-red-500 rounded-full shadow-lg orb-error"></div>
        );
      default:
        return (
          <div className="w-16 h-16 bg-gray-400/20 dark:bg-gray-700/30 rounded-full border border-gray-400/20"></div>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center transition-all duration-500 ease-in-out">
      {renderOrb()}
    </div>
  );
};

export default DynamicOrb;
