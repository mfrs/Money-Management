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
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:3001' : window.location.host;
    
    this.ws = new WebSocket(`${protocol}//${host}/api/gemini-live?token=${token}`);
    
    this.ws.onopen = async () => {
      this.onStateChange('connected');
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
      }
    };

    this.ws.onclose = () => {
      this.stop();
    };
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

        // Send to Gemini
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            clientContent: {
              turns: [
                {
                  role: "user",
                  parts: [
                    {
                      inlineData: {
                        mimeType: "audio/pcm;rate=16000",
                        data: base64
                      }
                    }
                  ]
                }
              ],
              turnComplete: true
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
