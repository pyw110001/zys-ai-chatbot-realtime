
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { logger } from './debugLogger';
import { decode, decodeAudioData, encode, floatTo16BitPCM } from '../utils/audioUtils';

export class GeminiLiveService {
  private session: any = null;
  private audioContext: AudioContext | null = null;
  private inputAudioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private sources: Set<AudioBufferSourceNode> = new Set();
  private isConnected: boolean = false;
  private microphoneStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;

  async connect(onMessage: (text: string, role: 'user' | 'model', isFinal: boolean) => void) {
    if (this.isConnected) return;

    logger.log({ stage: 'SYSTEM', status: 'INFO', message: 'Initializing connection...' });
    
    try {
      // 检查 API Key
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        const error = new Error('API Key not found. Please set GEMINI_API_KEY in .env file.');
        logger.log({ 
          stage: 'SYSTEM', 
          status: 'ERROR', 
          message: 'API Key missing', 
          data: error 
        });
        throw error;
      }
      
      // 记录 API Key 状态（不显示完整 key）
      const apiKeyPreview = apiKey.length > 8 
        ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` 
        : '***';
      logger.log({ 
        stage: 'SYSTEM', 
        status: 'INFO', 
        message: `API Key found: ${apiKeyPreview}` 
      });

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      // Initialize GoogleGenAI right before connecting to ensure latest API key as per guidelines
      const ai = new GoogleGenAI({ apiKey });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `You are a helpful, low-latency voice assistant. 
          Respond fluently in Chinese (zh-CN) or Japanese (ja-JP) based on user input. 
          Keep responses concise (under 100 words) for natural flow.`,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        },
        callbacks: {
          onopen: async () => {
            logger.log({ stage: 'SYSTEM', status: 'SUCCESS', message: 'WebSocket connection opened' });
            // 等待 session 完全准备好后再启动麦克风
            try {
              // 确保 session 已经解析
              if (!this.session) {
                this.session = await sessionPromise;
              }
              this.isConnected = true;
              logger.log({ stage: 'SYSTEM', status: 'SUCCESS', message: 'Session initialized successfully' });
              // 确保 session 就绪后再启动麦克风
              await this.startMic(this.session);
            } catch (err: any) {
              const errorMsg = err?.message || String(err);
              logger.log({ 
                stage: 'SYSTEM', 
                status: 'ERROR', 
                message: 'Failed to initialize session', 
                data: { error: errorMsg, details: err } 
              });
              this.isConnected = false;
              // 如果初始化失败，关闭连接
              if (this.session) {
                try {
                  this.session.close();
                } catch (closeErr) {
                  // 忽略关闭错误
                }
              }
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            const startTime = Date.now();
            
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && this.audioContext) {
              this.nextStartTime = Math.max(this.nextStartTime, this.audioContext.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), this.audioContext, 24000, 1);
              const source = this.audioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(this.audioContext.destination);
              source.start(this.nextStartTime);
              this.nextStartTime += audioBuffer.duration;
              this.sources.add(source);
              source.onended = () => this.sources.delete(source);
              
              logger.log({ 
                stage: 'TTS', 
                status: 'SUCCESS', 
                message: 'Audio chunk received', 
                duration: Date.now() - startTime 
              });
            }

            // Handle Transcriptions
            if (message.serverContent?.inputTranscription) {
              onMessage(message.serverContent.inputTranscription.text, 'user', !!message.serverContent.turnComplete);
              logger.log({ stage: 'ASR', status: 'INFO', message: 'Transcription received', data: message.serverContent.inputTranscription.text });
            }
            if (message.serverContent?.outputTranscription) {
              onMessage(message.serverContent.outputTranscription.text, 'model', !!message.serverContent.turnComplete);
              logger.log({ stage: 'LLM', status: 'INFO', message: 'Model response chunk received', data: message.serverContent.outputTranscription.text });
            }

            if (message.serverContent?.interrupted) {
              this.stopAudio();
              // Fix: Changed 'WARN' to 'INFO' to match LogEntry status type
              logger.log({ stage: 'SYSTEM', status: 'INFO', message: 'Audio interrupted by user' });
            }
          },
          onerror: (e: any) => {
            const errorMsg = e?.message || e?.error?.message || String(e);
            logger.log({ 
              stage: 'SYSTEM', 
              status: 'ERROR', 
              message: 'WebSocket Error', 
              data: { error: errorMsg, details: e } 
            });
            this.isConnected = false;
          },
          onclose: (event?: any) => {
            this.isConnected = false;
            const closeReason = event?.code ? ` (code: ${event.code}, reason: ${event.reason || 'unknown'})` : '';
            logger.log({ 
              stage: 'SYSTEM', 
              status: 'INFO', 
              message: `WebSocket connection closed${closeReason}`,
              data: event 
            });
            // 清理资源
            this.cleanup();
          }
        }
      });

      // 等待连接建立
      this.session = await sessionPromise;
      logger.log({ stage: 'SYSTEM', status: 'SUCCESS', message: 'Connection promise resolved' });
      
      // 如果 onopen 还没有被调用，等待一小段时间确保连接稳定
      if (!this.isConnected) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      const errorDetails = {
        message: errorMsg,
        stack: err?.stack,
        name: err?.name,
        ...err
      };
      logger.log({ 
        stage: 'SYSTEM', 
        status: 'ERROR', 
        message: 'Failed to connect', 
        data: errorDetails 
      });
      this.cleanup();
      throw err;
    }
  }

  private async startMic(session: any) {
    try {
      if (!this.isConnected || !session) {
        logger.log({ stage: 'ASR', status: 'ERROR', message: 'Cannot start mic: session not ready' });
        return;
      }

      this.microphoneStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });
      
      const source = this.inputAudioContext!.createMediaStreamSource(this.microphoneStream);
      this.scriptProcessor = this.inputAudioContext!.createScriptProcessor(4096, 1, 1);

      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.isConnected || !session) return;
        try {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = floatTo16BitPCM(inputData);
          // 直接使用已解析的 session，避免 Promise 链
          session.sendRealtimeInput({
            media: {
              data: encode(pcmData),
              mimeType: 'audio/pcm;rate=16000'
            }
          });
        } catch (err) {
          // 静默处理错误，避免日志过多
          if (this.isConnected) {
            logger.log({ stage: 'ASR', status: 'ERROR', message: 'Failed to send audio chunk', data: err });
          }
        }
      };

      source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.inputAudioContext!.destination);
      logger.log({ stage: 'ASR', status: 'SUCCESS', message: 'Microphone stream started' });
    } catch (err) {
      logger.log({ stage: 'ASR', status: 'ERROR', message: 'Microphone access denied', data: err });
      this.isConnected = false;
    }
  }

  private stopAudio() {
    this.sources.forEach(s => s.stop());
    this.sources.clear();
    this.nextStartTime = 0;
  }

  private cleanup() {
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(t => t.stop());
      this.microphoneStream = null;
    }
  }

  disconnect() {
    this.stopAudio();
    this.isConnected = false;
    if (this.session) {
      try {
        this.session.close();
      } catch (err) {
        logger.log({ stage: 'SYSTEM', status: 'ERROR', message: 'Error closing session', data: err });
      }
      this.session = null;
    }
    this.cleanup();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
    }
    if (this.inputAudioContext && this.inputAudioContext.state !== 'closed') {
      this.inputAudioContext.close().catch(() => {});
    }
    logger.log({ stage: 'SYSTEM', status: 'INFO', message: 'All services stopped' });
  }
}
