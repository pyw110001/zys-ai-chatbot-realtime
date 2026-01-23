
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
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // Corporate description provided by the user
      const corporateBio = `Found in Shanghai by Qibing Jiang, HITOSHI Ltd. is a multi-disciplinary architectural design studio expanding their design work from reality to meta universe. In 2023, HITOSHI established a new brand of tech. and art consulting service, HITOSHI in Tokyo. With Qibing’s experience of being director of leading international architectural firm and resonance of vernacular culture, Hitoshi DRL provides a overall solution crossing architecture, interior and tech. & art consulting responding to a highly mixed social environment of globalization and localization for a new paradigm in architecture and interior space. Our designs aim to break down professional categorization, integrate various disciplines, span real and virtual spaces, and ultimately create impressive and pleasant spaces.`;

      // Construct System Instruction with HITOSHI context
      let systemInstructionText = `You are the AI ASSISTANT for HITOSHI Ltd. (斉設計研究所株式会社). You are a professional, helpful, and sophisticated voice assistant for this multi-disciplinary architectural design studio.

[STUDIO BACKGROUND]
${corporateBio}

[CORE VALUES]
- Break down professional categorization.
- Integrate various disciplines.
- Span real and virtual spaces.
- Create impressive and pleasant spaces.

[INTERACTION STYLE]
- Respond fluently in Chinese (zh-CN) or Japanese (ja-JP) based on user input.
- Keep responses concise (under 100 words) for natural voice flow.
- Tone: Professional, architectural, creative, and forward-thinking.`;

      if (knowledgeBase && knowledgeBase.trim().length > 0) {
        systemInstructionText += `\n\n### ADDITIONAL KNOWLEDGE BASE ###
        Use this specific information as priority for factual queries:
        ${knowledgeBase}`;
      }

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
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
            }

            if (message.serverContent?.inputTranscription) {
              onMessage(message.serverContent.inputTranscription.text, 'user', !!message.serverContent.turnComplete);
            }
            if (message.serverContent?.outputTranscription) {
              onMessage(message.serverContent.outputTranscription.text, 'model', !!message.serverContent.turnComplete);
            }

            if (message.serverContent?.interrupted) {
              this.stopAudio();
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
      logger.log({ stage: 'SYSTEM', status: 'ERROR', message: 'Connection failed', data: err });
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
    } catch (err) {
      logger.log({ stage: 'ASR', status: 'ERROR', message: 'Mic access failed', data: err });
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
    if (this.scriptProcessor) this.scriptProcessor.disconnect();
    if (this.microphoneStream) this.microphoneStream.getTracks().forEach(t => t.stop());
    if (this.audioContext) this.audioContext.close();
    if (this.inputAudioContext) this.inputAudioContext.close();
  }
}
