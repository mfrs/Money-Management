// Web Audio API helper for Gemini Live Streaming
export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioWorkletNode: any = null; // Used for capturing PCM
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private nextPlayTime: number = 0;
  
  public onStateChange: (state: 'disconnected' | 'connecting' | 'connected' | 'listening') => void = () => {};
  public onAiSpeakingStateChange: (speaking: boolean) => void = () => {};

  async connect(token: string) {
    this.onStateChange('connecting');
    
    try {
      // 1. Fetch Gemini API Key securely from the backend
      const host = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
      const resKey = await fetch(`${host}/api/gemini-key`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resKey.ok) throw new Error('Failed to get Gemini Key');
      const { key } = await resKey.json();

      // 2. Connect directly to Gemini Live API
      const geminiWsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${key}`;
      this.ws = new WebSocket(geminiWsUrl);
      
      this.ws.onopen = async () => {
        this.onStateChange('connected');
        
        // 3. Send setup message
        this.ws?.send(JSON.stringify({
          setup: {
            model: 'models/gemini-2.0-flash-exp',
            systemInstruction: {
              parts: [{
                text: `You are Stashly's AI Voice Assistant, an intelligent financial advisor. 
You communicate concisely, naturally, and warmly in the user's spoken language. 
Keep your verbal responses relatively short and conversational. Do not read out long lists of data or IDs. Be extremely brief but helpful.`
              }]
            },
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: "Aoede",
                  }
                }
              }
            }
          }
        }));

        await this.startMicrophone();
      };

      this.ws.onmessage = async (event) => {
        if (typeof event.data === 'string') {
          try {
            const res = JSON.parse(event.data);
            // Gemini returns Base64 PCM 16kHz in serverContent.modelTurn.parts[...].inlineData.data
            if (res.serverContent && res.serverContent.modelTurn) {
              this.onAiSpeakingStateChange(true);
              const parts = res.serverContent.modelTurn.parts;
              for (const part of parts) {
                if (part.inlineData && part.inlineData.mimeType.includes('audio/pcm')) {
                  this.playPcmBase64(part.inlineData.data);
                }
              }
            }
            if (res.serverContent && res.serverContent.turnComplete) {
              // AI finished speaking
              setTimeout(() => this.onAiSpeakingStateChange(false), 500);
            }
          } catch (e) {
            console.error("Failed to parse Gemini message", e);
          }
        } else if (event.data instanceof Blob) {
           // Handle binary data if needed
           const text = await event.data.text();
           console.log(text);
        }
      };

      this.ws.onclose = (event) => {
        console.error("Gemini WS Closed:", event.code, event.reason);
        this.stop();
      };

    } catch (e) {
      console.error("Connection error", e);
      this.onStateChange('disconnected');
    }
  }

  private async startMicrophone() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Inline Scriptlet to capture PCM
      // Modern browsers support AudioWorklet. For simplicity in this React app without ejecting Vite, 
      // we can use ScriptProcessorNode as a fallback or dynamically inject a blob.
      const bufferSize = 2048;
      const processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32 to Int16
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Convert to Base64
        const buffer = new ArrayBuffer(pcm16.length * 2);
        const view = new DataView(buffer);
        pcm16.forEach((val, i) => view.setInt16(i * 2, val, true));
        
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        // Send to Gemini using realtimeInput
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            realtimeInput: {
              mediaChunks: [
                {
                  mimeType: "audio/pcm;rate=16000",
                  data: base64
                }
              ]
            }
          }));
        }
      };

      this.sourceNode.connect(processor);
      processor.connect(this.audioContext.destination);
      this.audioWorkletNode = processor;
      this.onStateChange('listening');

    } catch (e) {
      console.error("Microphone setup failed", e);
      this.stop();
    }
  }

  private async playPcmBase64(base64: string) {
    if (!this.audioContext) return;
    
    // Convert base64 to Int16Array
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    const pcm16 = new Int16Array(bytes.buffer);
    
    // Convert Int16 to Float32
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768.0;
    }
    
    const audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000); // Gemini 2.0 returns 24kHz audio
    audioBuffer.getChannelData(0).set(float32);
    
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    
    // Playback scheduling to prevent overlapping stutters
    const currentTime = this.audioContext.currentTime;
    if (this.nextPlayTime < currentTime) {
      this.nextPlayTime = currentTime;
    }
    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuffer.duration;
  }

  stop() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.sourceNode && this.audioWorkletNode) {
      this.sourceNode.disconnect();
      this.audioWorkletNode.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.onStateChange('disconnected');
    this.onAiSpeakingStateChange(false);
  }
}
