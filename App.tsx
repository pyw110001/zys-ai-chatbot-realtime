
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GeminiLiveService } from './services/geminiLiveService';
import { Message, InteractionState } from './types';
import DebugConsole from './components/DebugConsole';
import DynamicOrb from './components/DynamicOrb';
import ChatBubble from './components/ChatBubble';
import Toast from './components/Toast';
import { logger } from './services/debugLogger';

// SVG Logo component recreated from user image
const ZysLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    viewBox="0 0 100 100" 
    className={className}
    fill="currentColor"
  >
    <path d="M26.8 27.8H59.4L37.1 50.1H26.8V27.8Z" />
    <path d="M73.2 27.8L51.9 49.1L26.8 74.2H59.4L73.2 60.4V27.8Z" />
    <path d="M40.6 74.2H73.2V51.9H62.9L40.6 74.2Z" />
  </svg>
);

const App: React.FC = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentOutput, setCurrentOutput] = useState('');
  const [interactionState, setInteractionState] = useState<InteractionState>('idle');
  const [showDebug, setShowDebug] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' } | null>(null);
  
  const geminiServiceRef = useRef<GeminiLiveService | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  useEffect(() => {
    geminiServiceRef.current = new GeminiLiveService();
    return () => {
      geminiServiceRef.current?.disconnect();
    };
  }, []);

  const handleMessage = useCallback((text: string, role: 'user' | 'model', isFinal: boolean) => {
    if (role === 'user') {
      setInteractionState('thinking');
      setCurrentInput(prev => isFinal ? '' : text);
      if (isFinal) {
        setMessages(prev => [...prev, { id: Math.random().toString(), role: 'user', text, timestamp: Date.now() }]);
      }
    } else {
      setInteractionState('speaking');
      setCurrentOutput(prev => isFinal ? '' : prev + text);
      if (isFinal) {
        setMessages(prev => [...prev, { id: Math.random().toString(), role: 'model', text: currentOutput + text, timestamp: Date.now() }]);
        setTimeout(() => setInteractionState('listening'), 1000);
      }
    }
  }, [currentOutput]);

  const toggleConnection = async () => {
    if (isConnected) {
      geminiServiceRef.current?.disconnect();
      setIsConnected(false);
      setInteractionState('idle');
      setToast({ message: 'Session ended', type: 'info' });
    } else {
      setIsConnecting(true);
      try {
        await geminiServiceRef.current?.connect(handleMessage);
        setIsConnected(true);
        setInteractionState('listening');
        setToast({ message: 'Connected to Gemini', type: 'info' });
      } catch (err) {
        setInteractionState('error');
        setToast({ message: 'Connection failed', type: 'error' });
      } finally {
        setIsConnecting(false);
      }
    }
  };

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');
  const toggleDebug = () => setShowDebug(s => !s);

  return (
    <div className={`flex flex-col h-screen bg-ios-light-bg dark:bg-ios-dark-bg text-ios-light-text dark:text-ios-dark-text transition-colors duration-300`}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Header */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 ios-glass z-20">
        {/* LOGO + Text Layout */}
        <div className="flex items-center">
          <div className="h-9 w-9 flex items-center justify-center mr-0.5">
            <ZysLogo className="h-full w-full text-ios-light-text dark:text-ios-dark-text" />
          </div>
          <div className="flex flex-col justify-between py-0.5 h-9">
            <h1 className="text-lg font-bold tracking-tight uppercase leading-none">ZYS AI ASSISTANT</h1>
            <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-bold leading-none">realtime</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={toggleDebug}
            className={`p-2 rounded-full transition-colors active:scale-95 ${showDebug ? 'bg-blue-500/10 text-blue-500' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}`}
            title="Toggle Debug Console"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </button>
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors active:scale-95"
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            ) : (
              <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            )}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Interface */}
        <main className="flex-1 flex flex-col relative transition-all duration-300">
          
          {/* Messages View */}
          <div className="flex-1 overflow-y-auto pt-8 pb-32 space-y-4">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center opacity-40 px-8 text-center">
                <p className="text-xl font-medium mb-2">Ready for interaction</p>
                <p className="text-sm">Tap the microphone to start a seamless voice session in Chinese or Japanese.</p>
              </div>
            )}
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Bottom Interactive Area */}
          <div className="absolute bottom-0 left-0 right-0 p-8 pb-12 ios-glass border-t border-gray-200 dark:border-gray-800 flex flex-col items-center gap-6 z-10">
            <DynamicOrb state={interactionState} />
            
            <button
              onClick={toggleConnection}
              disabled={isConnecting}
              className={`group relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 active:scale-90 ${
                isConnected 
                  ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]' 
                  : 'bg-[#007AFF] shadow-[0_0_20px_rgba(0,122,255,0.4)] hover:shadow-[0_0_30px_rgba(0,122,255,0.6)]'
              }`}
            >
              {isConnecting ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : isConnected ? (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              )}
            </button>
          </div>
        </main>

        {/* Debug Sidebar with Transition */}
        <aside 
          className={`absolute top-0 right-0 bottom-0 z-30 w-full md:w-96 border-l border-gray-200 dark:border-gray-800 bg-ios-light-bg dark:bg-ios-dark-bg overflow-hidden transition-transform duration-300 ease-in-out ${showDebug ? 'translate-x-0' : 'translate-x-full md:translate-x-full'}`}
          style={{ 
            boxShadow: showDebug ? '-10px 0 30px rgba(0,0,0,0.1)' : 'none' 
          }}
        >
          <div className="flex justify-end p-4 lg:hidden">
            <button onClick={toggleDebug} className="p-2 rounded-full bg-gray-200 dark:bg-gray-800">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <DebugConsole />
        </aside>
      </div>
    </div>
  );
};

export default App;
