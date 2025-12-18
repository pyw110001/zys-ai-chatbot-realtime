
import { LogEntry } from '../types';

class DebugLogger {
  private logs: LogEntry[] = [];
  private listeners: ((logs: LogEntry[]) => void)[] = [];

  log(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
    const newLog: LogEntry = {
      ...entry,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
    };
    this.logs = [newLog, ...this.logs].slice(0, 100);
    this.notify();
    
    // Performance console logging
    const style = entry.status === 'ERROR' ? 'color: #ff4d4f; font-weight: bold;' : 'color: #1890ff;';
    console.log(`%c[${entry.stage}] ${entry.message}`, style, entry.data || '');
  }

  private notify() {
    this.listeners.forEach(fn => fn(this.logs));
  }

  subscribe(fn: (logs: LogEntry[]) => void) {
    this.listeners.push(fn);
    fn(this.logs);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  clear() {
    this.logs = [];
    this.notify();
  }
}

export const logger = new DebugLogger();
