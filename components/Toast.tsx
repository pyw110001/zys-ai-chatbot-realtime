
import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'info' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
      <div className="px-6 py-2 bg-white/80 dark:bg-[#2C2C2E]/80 ios-glass border border-gray-200/50 dark:border-gray-700/50 rounded-full shadow-xl flex items-center gap-3">
        {type === 'error' && <div className="w-2 h-2 rounded-full bg-red-500"></div>}
        <span className="text-sm font-medium text-ios-light-text dark:text-ios-dark-text whitespace-nowrap">
          {message}
        </span>
      </div>
    </div>
  );
};

export default Toast;
