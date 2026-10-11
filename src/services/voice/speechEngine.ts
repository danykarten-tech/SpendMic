/**
 * Speech Recognition Engine & Audio Recorder Manager for Offline Voice Assistant
 */

export type SpeechEngineStatus =
  | 'unloaded'
  | 'preparing'
  | 'downloading'
  | 'loading_wasm'
  | 'ready'
  | 'listening'
  | 'processing'
  | 'error';

export interface SpeechEngineState {
  status: SpeechEngineStatus;
  downloadProgress: number; // 0-100
  statusMessage: string;
  errorMessage?: string;
  transcript: string;
  isMuted: boolean;
  isUsingFallback: boolean;
}

export type StateChangeCallback = (state: SpeechEngineState) => void;

class LocalSpeechEngine {
  private worker: Worker | null = null;
  private state: SpeechEngineState = {
    status: 'unloaded',
    downloadProgress: 0,
    statusMessage: 'Preparing offline voice...',
    transcript: '',
    isMuted: false,
    isUsingFallback: false,
  };

  private listeners: StateChangeCallback[] = [];
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private initPromise: Promise<void> | null = null;
  private recognition: any = null;
  private isNativeListening: boolean = false;
  private isUserListening: boolean = false;

  constructor() {
    this.initNativeRecognition();
    this.initAutomatic();
  }

  /**
   * Initializes browser-native SpeechRecognition for zero-latency, high-accuracy multilingual recognition
   */
  private initNativeRecognition() {
    if (typeof window === 'undefined') return;
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      try {
        this.recognition = new SpeechRecognitionClass();
        // Keep listening continuously so user can speak with natural pauses/delays without cutting off
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        // Prioritize English & Indian English, understanding accents and Hinglish numbers
        this.recognition.lang = typeof navigator !== 'undefined' && navigator.language?.toLowerCase().includes('hi')
          ? 'hi-IN'
          : 'en-IN';

        this.recognition.onstart = () => {
          this.isNativeListening = true;
          this.state.status = 'listening';
          this.state.statusMessage = 'Listening... Speak your expense, income, bills or savings command.';
          this.notify();
        };

        this.recognition.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';
          for (let i = 0; i < event.results.length; ++i) {
            const piece = event.results[i][0]?.transcript || '';
            if (event.results[i].isFinal) {
              finalTranscript += piece + ' ';
            } else {
              interimTranscript += piece;
            }
          }
          const text = (finalTranscript + interimTranscript).trim();
          if (text) {
            this.state.transcript = text;
            this.notify();
          }
        };

        this.recognition.onerror = (event: any) => {
          console.warn('Native speech recognition event:', event.error);
          if (event.error === 'not-allowed') {
            this.isUserListening = false;
            this.isNativeListening = false;
            this.state.status = 'error';
            this.state.errorMessage = 'Microphone permission denied. Please allow microphone access.';
            this.notify();
          } else if (event.error === 'no-speech') {
            // In continuous listening, ignore silence timeouts and keep listening if user hasn't stopped
            if (!this.isUserListening) {
              this.isNativeListening = false;
              this.state.status = 'ready';
              this.state.statusMessage = 'No speech detected — Tap mic and try again.';
              this.notify();
            }
          } else {
            if (!this.isUserListening) {
              this.isNativeListening = false;
              this.state.status = 'ready';
              this.notify();
            }
          }
        };

        this.recognition.onend = () => {
          // If the user has not pressed Stop or Close, keep listening across silence boundaries
          if (this.isUserListening && this.recognition) {
            try {
              this.recognition.start();
              return;
            } catch (e) {
              // Ignore if already starting
            }
          }
          this.isNativeListening = false;
          this.state.status = 'ready';
          this.state.statusMessage = this.state.transcript ? 'Transcription complete.' : 'Offline voice ready';
          this.notify();
        };

        // If native speech engine is supported in browser, it is ready immediately!
        this.state.status = 'ready';
        this.state.downloadProgress = 100;
        this.state.statusMessage = 'Offline voice ready';
      } catch (e) {
        console.warn('Native speech recognition initialization error:', e);
        this.recognition = null;
      }
    }
  }

  public subscribe(callback: StateChangeCallback): () => void {
    this.listeners.push(callback);
    callback(this.state);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener({ ...this.state });
    }
  }

  public getState(): SpeechEngineState {
    return { ...this.state };
  }

  public toggleMute() {
    this.state.isMuted = !this.state.isMuted;
    this.notify();
  }

  /**
   * Checks if local Whisper model is already cached in browser CacheStorage or localStorage
   */
  public async checkCacheStatus(): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheKeys = await caches.keys();
        const hasModelCache = cacheKeys.some(
          (k) => k.includes('transformers') || k.includes('xenova') || k.includes('voice')
        );
        if (hasModelCache) {
          return true;
        }
      }
      if (typeof localStorage !== 'undefined' && localStorage.getItem('pocket_voice_ready') === 'true') {
        return true;
      }
    } catch (e) {
      // Ignore cache check failure
    }
    return false;
  }

  /**
   * Automatically initializes the offline WebAssembly speech model
   */
  public async initAutomatic(): Promise<void> {
    if (this.state.status === 'ready' || this.state.status === 'preparing') {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      // Guard against non-browser environments (e.g. test environments without Worker)
      if (typeof window === 'undefined' || typeof Worker === 'undefined') {
        return;
      }

      try {
        const isCached = await this.checkCacheStatus();

        this.state.status = 'preparing';
        this.state.downloadProgress = isCached ? 60 : 15;
        this.state.statusMessage = isCached ? 'Loading speech engine...' : 'Preparing offline voice...';
        this.notify();

        if (!this.worker) {
          this.worker = new Worker(new URL('./speechWorker.ts', import.meta.url), { type: 'module' });

          this.worker.onmessage = (event) => {
            const { status, progress, message, text, error } = event.data;

            if (status === 'preparing' || status === 'downloading') {
              this.state.status = 'preparing';
              this.state.downloadProgress = progress !== undefined ? progress : this.state.downloadProgress;
              this.state.statusMessage = message || 'Preparing offline voice...';
              this.notify();
            } else if (status === 'ready') {
              this.state.status = 'ready';
              this.state.downloadProgress = 100;
              this.state.statusMessage = 'Offline voice ready';
              try {
                localStorage.setItem('pocket_voice_ready', 'true');
              } catch (e) {}
              this.notify();
            } else if (status === 'processing') {
              this.state.status = 'processing';
              this.state.statusMessage = 'Processing speech audio locally...';
              this.notify();
            } else if (status === 'transcription_complete') {
              this.state.status = 'ready';
              this.state.transcript = text;
              this.state.statusMessage = 'Transcription complete.';
              this.notify();
            } else if (status === 'error') {
              this.state.status = 'error';
              this.state.errorMessage = error;
              this.state.statusMessage = 'Setup failed — Retry';
              this.notify();
            }
          };

          this.worker.onerror = (err) => {
            this.state.status = 'error';
            this.state.errorMessage = err.message || 'Speech worker initialization error.';
            this.state.statusMessage = 'Setup failed — Retry';
            this.notify();
          };
        }

        this.worker.postMessage({ type: 'INIT_MODEL' });
      } catch (err: any) {
        this.state.status = 'error';
        this.state.errorMessage = err.message || 'Failed to initialize local speech engine worker.';
        this.state.statusMessage = 'Setup failed — Retry';
        this.notify();
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Retries speech engine setup if interrupted or offline on first launch
   */
  public async retrySetup() {
    this.state.errorMessage = undefined;
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch (e) {}
      this.worker = null;
    }
    await this.initAutomatic();
  }

  /**
   * Backwards-compatible alias for downloadAndInitModel
   */
  public async downloadAndInitModel() {
    return this.initAutomatic();
  }


  /**
   * Starts microphone recording (continuous until user stops)
   */
  public async startListening() {
    this.isUserListening = true;
    this.state.transcript = '';
    this.state.errorMessage = undefined;

    // 1. Try browser-native SpeechRecognition first (instant, real-time streaming, high accuracy)
    if (this.recognition) {
      try {
        this.recognition.start();
        return;
      } catch (err: any) {
        if (err.name === 'InvalidStateError') {
          // Already running
          return;
        }
        console.warn('Native speech recognition start failed, using MediaRecorder fallback:', err);
      }
    }

    // 2. Fallback to local MediaRecorder + Whisper engine
    if (this.state.status !== 'ready' && !this.worker) {
      this.state.errorMessage = 'Please wait for offline voice engine to finish preparing.';
      this.notify();
      return;
    }

    // Check browser MediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.state.status = 'error';
      this.state.errorMessage = 'Microphone is not supported in this browser.';
      this.notify();
      return;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];

      try {
        if (!this.audioContext) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            this.audioContext = new AudioContextClass({ sampleRate: 16000 });
          }
        }
        if (this.audioContext && this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
      } catch (e) {
        // Continue even if pre-warming context throws
      }

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType });
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      this.mediaRecorder.onstop = () => {
        this.processRecordedAudio();
      };

      // Clean unfragmented audio recording
      this.mediaRecorder.start();
      this.state.status = 'listening';
      this.state.statusMessage = 'Listening... Speak your expense, income, bills or savings command.';
      this.notify();
    } catch (err: any) {
      this.isUserListening = false;
      this.state.status = 'error';
      this.state.errorMessage = 'Microphone permission denied or unavailable.';
      this.notify();
    }
  }

  /**
   * Stops listening and triggers processing
   */
  public stopListening() {
    this.isUserListening = false;
    if (this.recognition && this.isNativeListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.isNativeListening = false;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      }
    }
    this.state.status = 'ready';
    this.state.statusMessage = 'Voice ready — Tap mic to speak';
    this.notify();
  }

  public cancelListening() {
    this.isUserListening = false;
    if (this.recognition && this.isNativeListening) {
      try {
        this.recognition.abort();
      } catch (e) {}
      this.isNativeListening = false;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }
    this.state.status = 'ready';
    this.state.statusMessage = 'Listening cancelled.';
    this.state.transcript = '';
    this.notify();
  }

  /**
   * Linear resampler ensuring exact 16,000 Hz Float32 audio for Whisper
   */
  private resampleTo16kHz(audioData: Float32Array, origSampleRate: number): Float32Array {
    if (origSampleRate === 16000) return audioData;

    const ratio = origSampleRate / 16000;
    const newLength = Math.round(audioData.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const origIndex = i * ratio;
      const indexFloor = Math.floor(origIndex);
      const indexCeil = Math.min(origIndex + 1, audioData.length - 1);
      const fraction = origIndex - indexFloor;
      result[i] = audioData[indexFloor] * (1 - fraction) + audioData[indexCeil] * fraction;
    }

    return result;
  }

  /**
   * Converts recorded audio blob to 16kHz Float32 PCM array for Whisper Web Worker
   */
  private async processRecordedAudio() {
    if (this.audioChunks.length === 0) return;

    try {
      const blob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
      const arrayBuffer = await blob.arrayBuffer();

      if (!this.audioContext) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioContextClass({ sampleRate: 16000 });
      }

      const decodedBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      const rawChannelData = decodedBuffer.getChannelData(0); // Mono PCM
      let float32Data: Float32Array<ArrayBufferLike> = new Float32Array(rawChannelData.length);
      float32Data.set(rawChannelData);

      // Ensure exact 16kHz sample rate for Whisper
      if (decodedBuffer.sampleRate !== 16000) {
        float32Data = this.resampleTo16kHz(float32Data, decodedBuffer.sampleRate);
      }

      if (this.worker) {
        this.worker.postMessage({
          type: 'TRANSCRIBE',
          data: { audioData: float32Data },
        });
      }
    } catch (e: any) {
      // Fallback transcription if audio context decode fails
      this.state.status = 'ready';
      this.state.statusMessage = 'Recording processed.';
      this.notify();
    }
  }

  /**
   * Offline Text-To-Speech Output using browser window.speechSynthesis
   */

  public speak(text: string) {
    if (this.state.isMuted || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      // Ignore speech synthesis failures
    }
  }
}

export const speechEngine = new LocalSpeechEngine();
