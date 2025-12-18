
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GeminiLiveService } from './services/geminiLiveService';
import { Message, LogEntry } from './types';
import DebugConsole from './components/DebugConsole';
import VoiceIndicator from './components/VoiceIndicator';
import { logger } from './services/debugLogger';

const App: React.FC = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentOutput, setCurrentOutput] = useState('');
  
  const geminiServiceRef = useRef<GeminiLiveService | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    geminiServiceRef.current = new GeminiLiveService();
    return () => {
      geminiServiceRef.current?.disconnect();
    };
  }, []);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentInput, currentOutput]);

  const handleMessage = useCallback((text: string, role: 'user' | 'model', isFinal: boolean) => {
    if (role === 'user') {
      setCurrentInput(prev => isFinal ? '' : text);
      if (isFinal) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() }]);
      }
    } else {
      setCurrentOutput(prev => isFinal ? '' : prev + text);
      if (isFinal) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: currentOutput + text, timestamp: Date.now() }]);
      }
    }
  }, [currentOutput]);

  const toggleConnection = async () => {
    if (isConnected) {
      geminiServiceRef.current?.disconnect();
      setIsConnected(false);
    } else {
      setIsConnecting(true);
      try {
        await geminiServiceRef.current?.connect(handleMessage);
        setIsConnected(true);
      } catch (err) {
        alert('Failed to connect to voice services. Please check your API key and microphone permissions.');
      } finally {
        setIsConnecting(false);
      }
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-950 font-sans selection:bg-blue-500/30">
      {/* Sidebar - Settings & Stats */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-gray-800 p-6 flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent mb-1">
            Gemini Voice Flow
          </h1>
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Native Real-time Audio v2.5</p>
        </div>

        <div className="space-y-4">
          <VoiceIndicator isActive={isConnected} label={isConnected ? "Listening & Ready" : "System Standby"} />
          
          <button
            onClick={toggleConnection}
            disabled={isConnecting}
            className={`w-full py-4 px-6 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-3 ${
              isConnected 
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30' 
                : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20'
            }`}
          >
            {isConnecting ? (
              <span className="animate-spin border-2 border-white/20 border-t-white rounded-full w-5 h-5"></span>
            ) : isConnected ? 'End Conversation' : 'Start Audio Session'}
          </button>
        </div>

        <div className="mt-auto space-y-4">
          <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Capabilities</h3>
            <ul className="text-sm text-gray-300 space-y-2">
              <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> 中文 & 日本語 ASR</li>
              <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> Low-Latency TTS</li>
              <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> Streamed Context</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-950">
        <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 scroll-smooth">
          {messages.length === 0 && !currentInput && !currentOutput && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <div className="w-24 h-24 mb-6 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <p className="text-xl font-medium max-w-sm">Tap Start to begin a sub-400ms latency voice session.</p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[70%] p-5 rounded-3xl ${
                msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-gray-900 border border-gray-800 text-gray-100 rounded-tl-none'
              }`}>
                <p className="text-lg leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                <span className="text-[10px] mt-2 block opacity-50 uppercase font-bold tracking-tighter">
                  {new Date(msg.timestamp).toLocaleTimeString()} • {msg.role}
                </span>
              </div>
            </div>
          ))}

          {currentInput && (
            <div className="flex justify-end opacity-60">
              <div className="max-w-[70%] p-5 rounded-3xl bg-blue-600/50 text-white italic rounded-tr-none border border-white/10">
                <p className="text-lg leading-relaxed">{currentInput}...</p>
              </div>
            </div>
          )}

          {currentOutput && (
            <div className="flex justify-start">
              <div className="max-w-[70%] p-5 rounded-3xl bg-gray-900 border border-blue-500/30 text-blue-100 rounded-tl-none animate-pulse">
                <p className="text-lg leading-relaxed">{currentOutput}</p>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Debug Console Component */}
      <div className="hidden lg:block w-[400px]">
        <DebugConsole />
      </div>
    </div>
  );
};

export default App;
