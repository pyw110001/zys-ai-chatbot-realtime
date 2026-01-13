
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

  async connect(
    onMessage: (text: string, role: 'user' | 'model', isFinal: boolean) => void,
    knowledgeBase: string = ''
  ) {
    if (this.isConnected) return;

    logger.log({ stage: 'SYSTEM', status: 'INFO', message: 'Initializing connection...' });
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      // Initialize GoogleGenAI right before connecting to ensure latest API key as per guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // Construct System Instruction with Knowledge Base
      let systemInstructionText = `You are ZYS AI ASSISTANT, a professional and helpful voice assistant. 
          Respond fluently in Chinese (zh-CN) or Japanese (ja-JP) based on user input. 
          Keep responses concise (under 100 words) for natural flow.`;

      if (knowledgeBase && knowledgeBase.trim().length > 0) {
        systemInstructionText += `\n\n### CRITICAL KNOWLEDGE BASE (STRICT ADHERENCE) ###
        
        The following text contains the OFFICIAL facts about partners, products, or services. 
        When user asks about topics covered here, you MUST:
        1. Prioritize this information over your general training.
        2. Speak as an official representative of these entities.
        3. Do not invent details (hallucinate) if they are not present below.
        
        --- START OF KNOWLEDGE BASE ---
        ${knowledgeBase}
        --- END OF KNOWLEDGE BASE ---`;
        
        logger.log({ stage: 'SYSTEM', status: 'INFO', message: 'Knowledge base injected with strict adherence protocols.' });
      }

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: systemInstructionText,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        },
        callbacks: {
          onopen: () => {
            this.isConnected = true;
            logger.log({ stage: 'SYSTEM', status: 'SUCCESS', message: 'WebSocket connection opened' });
            this.startMic(sessionPromise);
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
          onerror: (e) => {
            logger.log({ stage: 'SYSTEM', status: 'ERROR', message: 'WebSocket Error', data: e });
          },
          onclose: () => {
            this.isConnected = false;
            logger.log({ stage: 'SYSTEM', status: 'INFO', message: 'WebSocket connection closed' });
          }
        }
      });

      this.session = await sessionPromise;
    } catch (err) {
      logger.log({ 
        stage: 'SYSTEM', 
        status: 'ERROR', 
        message: 'Failed to connect', 
        data: err 
      });
      throw err;
    }
  }

  private async startMic(sessionPromise: Promise<any>) {
    try {
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.inputAudioContext!.createMediaStreamSource(this.microphoneStream);
      this.scriptProcessor = this.inputAudioContext!.createScriptProcessor(4096, 1, 1);

      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.isConnected) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = floatTo16BitPCM(inputData);
        // Use sessionPromise.then to avoid stale closures as per guidelines
        sessionPromise.then(session => {
          session.sendRealtimeInput({
            media: {
              data: encode(pcmData),
              mimeType: 'audio/pcm;rate=16000'
            }
          });
        });
      };

      source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.inputAudioContext!.destination);
      logger.log({ stage: 'ASR', status: 'SUCCESS', message: 'Microphone stream started' });
    } catch (err) {
      logger.log({ stage: 'ASR', status: 'ERROR', message: 'Microphone access denied', data: err });
    }
  }

  private stopAudio() {
    this.sources.forEach(s => s.stop());
    this.sources.clear();
    this.nextStartTime = 0;
  }

  disconnect() {
    this.stopAudio();
    this.isConnected = false;
    if (this.session) {
      this.session.close();
      this.session = null;
    }
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
    }
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(t => t.stop());
    }
    if (this.audioContext) this.audioContext.close();
    if (this.inputAudioContext) this.inputAudioContext.close();
    logger.log({ stage: 'SYSTEM', status: 'INFO', message: 'All services stopped' });
  }
}
