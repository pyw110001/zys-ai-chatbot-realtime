
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GeminiLiveService } from './services/geminiLiveService';
import { Message, InteractionState } from './types';
import DebugConsole from './components/DebugConsole';
import DynamicOrb from './components/DynamicOrb';
import ChatBubble from './components/ChatBubble';
import Toast from './components/Toast';
import KnowledgeBaseModal from './components/KnowledgeBaseModal';
import { logger } from './services/debugLogger';

const LOGO_URL = "https://i.ibb.co/99Zyy32W/20260123100211-2-185.png";

const App: React.FC = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [interactionState, setInteractionState] = useState<InteractionState>('idle');
  const [showDebug, setShowDebug] = useState(false);
  const [kbOpen, setKbOpen] = useState(false);
  const [kbContent, setKbContent] = useState('');
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
      if (isFinal) {
        setMessages(prev => [...prev, { id: Math.random().toString(), role: 'user', text, timestamp: Date.now() }]);
      }
    } else {
      setInteractionState('speaking');
      if (isFinal) {
        setMessages(prev => [...prev, { id: Math.random().toString(), role: 'model', text, timestamp: Date.now() }]);
        setTimeout(() => setInteractionState('listening'), 1000);
      }
    }
  }, []);

  const toggleConnection = async () => {
    if (isConnected) {
      geminiServiceRef.current?.disconnect();
      setIsConnected(false);
      setInteractionState('idle');
      setToast({ message: 'Session ended', type: 'info' });
    } else {
      setIsConnecting(true);
      try {
        await geminiServiceRef.current?.connect(handleMessage, kbContent);
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
      
      <KnowledgeBaseModal 
        isOpen={kbOpen} 
        onClose={() => setKbOpen(false)}
        initialContent={kbContent}
        onSave={(content) => {
          setKbContent(content);
          setToast({ message: 'Knowledge base updated', type: 'info' });
        }}
      />

      {/* Header */}
      <header className="h-24 px-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 ios-glass z-20">
        {/* LOGO + Text Layout */}
        <div className="flex items-center">
          <div className="h-16 flex items-center justify-center mr-6">
            <img 
              src={LOGO_URL} 
              alt="HITOSHI Logo" 
              className="h-full w-auto object-contain dark:brightness-110"
              style={{ mixBlendMode: theme === 'light' ? 'multiply' : 'normal' }}
            />
          </div>
          <div className="hidden sm:flex flex-col justify-center h-16 border-l border-gray-300 dark:border-gray-700 pl-6">
            <h1 className="text-2xl font-bold tracking-tight uppercase leading-none">AI ASSISTANT</h1>
            <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mt-2">realtime session</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <button 
            onClick={() => setKbOpen(true)}
            className={`p-2 rounded-full transition-colors active:scale-95 ${kbContent.length > 0 ? 'bg-blue-500/10 text-blue-500' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </button>

          <button 
            onClick={toggleDebug}
            className={`p-2 rounded-full transition-colors active:scale-95 ${showDebug ? 'bg-blue-500/10 text-blue-500' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </button>

          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors active:scale-95"
          >
            {theme === 'light' ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            ) : (
              <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            )}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <main className="flex-1 flex flex-col relative transition-all duration-300">
          <div className="flex-1 overflow-y-auto pt-8 pb-32 space-y-4">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center opacity-40 px-8 text-center">
                <p className="text-2xl font-medium mb-3">Welcome to HITOSHI Studio AI</p>
                <p className="text-base max-w-sm">Discuss architectural design, interior spaces, or our meta-universe expansions in real-time.</p>
                {kbContent && (
                  <div className="mt-6 px-4 py-1.5 bg-blue-500/10 text-blue-500 rounded-full text-sm font-medium border border-blue-500/20">
                    Knowledge Base Active
                  </div>
                )}
              </div>
            )}
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-8 pb-12 ios-glass border-t border-gray-200 dark:border-gray-800 flex flex-col items-center gap-6 z-10">
            <DynamicOrb state={interactionState} />
            <button
              onClick={toggleConnection}
              disabled={isConnecting}
              className={`group relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 active:scale-90 ${
                isConnected 
                  ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]' 
                  : 'bg-[#007AFF] shadow-[0_0_30px_rgba(0,122,255,0.4)]'
              }`}
            >
              {isConnecting ? (
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : isConnected ? (
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              )}
            </button>
          </div>
        </main>

        <aside 
          className={`absolute top-0 right-0 bottom-0 z-30 w-full md:w-96 border-l border-gray-200 dark:border-gray-800 bg-ios-light-bg dark:bg-ios-dark-bg overflow-hidden transition-transform duration-300 ease-in-out ${showDebug ? 'translate-x-0' : 'translate-x-full'}`}
          style={{ boxShadow: showDebug ? '-10px 0 30px rgba(0,0,0,0.1)' : 'none' }}
        >
          <DebugConsole />
        </aside>
      </div>
    </div>
  );
};

export default App;
