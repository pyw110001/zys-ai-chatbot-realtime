
import React, { useEffect, useState, useRef } from 'react';
import { logger } from '../services/debugLogger';
import { LogEntry } from '../types';

const DebugConsole: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return logger.subscribe(setLogs);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800 font-mono text-xs overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-gray-900 sticky top-0">
        <span className="font-bold text-blue-400 uppercase tracking-widest">Debug Console</span>
        <button 
          onClick={() => logger.clear()}
          className="text-gray-500 hover:text-white transition-colors"
        >
          Clear
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 flex flex-col-reverse">
        {logs.map((log) => (
          <div key={log.id} className="border-b border-gray-800/50 pb-2 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-gray-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
              <span className={`px-1 rounded ${
                log.status === 'ERROR' ? 'bg-red-900/50 text-red-400' : 
                log.status === 'SUCCESS' ? 'bg-green-900/50 text-green-400' : 
                'bg-blue-900/50 text-blue-400'
              }`}>
                {log.stage}
              </span>
              {log.duration && <span className="text-gray-500">{log.duration}ms</span>}
            </div>
            <div className="text-gray-300">{log.message}</div>
            {log.data && (
              <pre className="mt-1 text-[10px] text-gray-500 bg-gray-950 p-1 rounded overflow-x-auto">
                {JSON.stringify(log.data, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DebugConsole;
