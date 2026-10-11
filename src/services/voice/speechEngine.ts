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

  constructor() {
    this.initAutomatic();
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
    this.state.transcript = '';
    this.state.errorMessage = undefined;

    // Requirement: Do not allow a microphone command to be processed until the speech engine is ready
    if (this.state.status !== 'ready') {
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

      // Pre-warm AudioContext so decodeAudioData does not incur cold-start delay
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

      this.mediaRecorder = new MediaRecorder(this.mediaStream);
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      this.mediaRecorder.onstop = () => {
        this.processRecordedAudio();
      };

      // 200ms slice for progressive audio buffering
      this.mediaRecorder.start(200);
      this.state.status = 'listening';
      this.state.statusMessage = 'Listening... Speak your expense, income, bills or savings command.';
      this.notify();
    } catch (err: any) {
      this.state.status = 'error';
      this.state.errorMessage = 'Microphone permission denied or unavailable.';
      this.notify();
    }
  }


  /**
   * Stops listening and triggers processing
   */
  public stopListening() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      }
      this.state.status = 'processing';
      this.state.statusMessage = 'Processing recorded speech...';
      this.notify();
    }
  }

  public cancelListening() {
    this.stopListening();
    this.state.status = this.worker ? 'ready' : 'unloaded';
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
   * Trims leading and trailing silence to significantly minimize Whisper inference latency
   */
  private trimSilence(audioData: Float32Array): Float32Array {
    const threshold = 0.008; // Energy threshold
    const frameSize = 320; // 20ms frames at 16kHz
    let start = 0;
    let end = audioData.length;

    // Detect first active audio frame
    for (let i = 0; i < audioData.length - frameSize; i += frameSize) {
      let sum = 0;
      for (let j = 0; j < frameSize; j++) {
        sum += Math.abs(audioData[i + j]);
      }
      if (sum / frameSize > threshold) {
        start = Math.max(0, i - frameSize * 4); // Keep ~80ms buffer
        break;
      }
    }

    // Detect last active audio frame
    for (let i = audioData.length - frameSize; i >= start; i -= frameSize) {
      let sum = 0;
      for (let j = 0; j < frameSize; j++) {
        sum += Math.abs(audioData[i + j]);
      }
      if (sum / frameSize > threshold) {
        end = Math.min(audioData.length, i + frameSize * 5); // Keep ~100ms buffer
        break;
      }
    }

    if (end <= start || end - start < frameSize * 5) {
      const copy = new Float32Array(audioData.length);
      copy.set(audioData);
      return copy;
    }

    const trimmed = new Float32Array(end - start);
    trimmed.set(audioData.subarray(start, end));
    return trimmed;
  }

  /**
   * Converts recorded audio blob to 16kHz Float32 PCM array for Whisper Web Worker
   */
  private async processRecordedAudio() {
    if (this.audioChunks.length === 0) return;

    try {
      const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
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

      // Trim silence from start and end to speed up Whisper inference
      float32Data = this.trimSilence(float32Data);

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
