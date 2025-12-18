
export enum Language {
  CHINESE = 'zh-CN',
  JAPANESE = 'ja-JP'
}

export type InteractionState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface LogEntry {
  id: string;
  timestamp: number;
  stage: 'SYSTEM' | 'ASR' | 'LLM' | 'TTS' | 'DEBUG';
  status: 'SUCCESS' | 'ERROR' | 'INFO';
  message: string;
  data?: any;
  duration?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface AppError {
  stage: string;
  message: string;
  solution: string;
  originalError?: any;
}
