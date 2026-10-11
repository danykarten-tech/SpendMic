/**
 * Web Worker for Truly Offline Local Speech Recognition using Whisper ONNX WebAssembly
 */

let transcriber: any = null;

self.onmessage = async (event: MessageEvent) => {
  const { type, data } = event.data;

  if (type === 'INIT_MODEL') {
    try {
      self.postMessage({ status: 'preparing', progress: 15, message: 'Loading speech engine runtime...' });

      // Dynamically load Transformers WebAssembly bundle inside worker using runtime dynamic import
      let transformers: any;
      const origin = (typeof self !== 'undefined' && self.location && self.location.origin) ? self.location.origin : '';
      const localLibUrl = `${origin}/lib/transformers.min.js`;
      const runtimeImport = new Function('specifier', 'return import(specifier);');

      try {
        transformers = await runtimeImport(localLibUrl);
      } catch (e1) {
        console.warn('Runtime import of local bundle failed, trying origin-relative path:', e1);
        try {
          transformers = await runtimeImport('/lib/transformers.min.js');
        } catch (e2) {
          try {
            const globalScope = self as any;
            if (typeof globalScope.importScripts === 'function') {
              globalScope.importScripts('/lib/transformers.min.js');
              transformers = globalScope.transformers || globalScope.xenova || globalScope;
            }
          } catch (e3) {
            console.warn('Local lib fallback failed, trying CDN fallback:', e3);
            const cdnUrl = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';
            transformers = await runtimeImport(cdnUrl);
          }
        }
      }

      const pipelineFn = transformers?.pipeline || transformers?.default?.pipeline || (self as any).pipeline || (self as any).transformers?.pipeline;
      const envObj = transformers?.env || transformers?.default?.env || (self as any).env || (self as any).transformers?.env;

      if (!pipelineFn) {
        throw new Error('Pipeline loader unavailable. Local speech engine could not be initialized.');
      }

      if (envObj) {
        envObj.allowLocalModels = true;
        envObj.localModelPath = '/models/';
        envObj.useBrowserCache = true;
        // Point WASM paths to /lib/ where ort-wasm-simd.wasm resides locally
        if (envObj.backends?.onnx?.wasm) {
          envObj.backends.onnx.wasm.wasmPaths = '/lib/';
          const hw = (typeof self !== 'undefined' && self.navigator && self.navigator.hardwareConcurrency) || 2;
          const threads = Math.min(4, Math.max(1, hw - 1));
          envObj.backends.onnx.wasm.numThreads = threads;
        }
      }

      self.postMessage({ status: 'preparing', progress: 35, message: 'Preparing neural model weights...' });

      // Attempt to load from bundled local model path first (/models/whisper-tiny.en/)
      try {
        if (envObj) envObj.allowRemoteModels = false;
        transcriber = await pipelineFn('automatic-speech-recognition', 'whisper-tiny.en', {
          quantized: true,
          progress_callback: (progressInfo: any) => {
            if (progressInfo.status === 'progress') {
              const percent = Math.round(progressInfo.progress || 0);
              self.postMessage({
                status: 'preparing',
                progress: 35 + Math.round(percent * 0.6),
                message: `Preparing speech model: ${percent}%`,
              });
            }
          },
        });
      } catch (localErr) {
        // Fallback to cached/remote model if local bundled path needs network resolution
        if (envObj) envObj.allowRemoteModels = true;
        transcriber = await pipelineFn('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
          quantized: true,
          progress_callback: (progressInfo: any) => {
            if (progressInfo.status === 'progress') {
              const percent = Math.round(progressInfo.progress || 0);
              self.postMessage({
                status: 'preparing',
                progress: 35 + Math.round(percent * 0.6),
                message: `Preparing speech model: ${percent}%`,
              });
            }
          },
        });
      }

      self.postMessage({ status: 'ready', progress: 100, message: 'Offline voice ready' });
    } catch (err: any) {
      self.postMessage({
        status: 'error',
        error: err.message || 'Failed to prepare offline speech recognition engine.',
      });
    }
  } else if (type === 'TRANSCRIBE') {
    if (!transcriber) {
      self.postMessage({ status: 'error', error: 'Speech recognition engine is not loaded.' });
      return;
    }

    try {
      self.postMessage({ status: 'processing', message: 'Processing speech on-device...' });
      const { audioData } = data; // Float32Array 16kHz audio samples

      const isShortAudio = audioData.length <= 16000 * 30;
      const inferenceOptions: any = {
        task: 'transcribe',
        language: 'en',
        return_timestamps: false,
        max_new_tokens: 64,
        temperature: 0.0,
        num_beams: 1,
        do_sample: false,
      };

      if (!isShortAudio) {
        inferenceOptions.chunk_length_s = 30;
        inferenceOptions.stride_length_s = 5;
      }

      const output = await transcriber(audioData, inferenceOptions);

      const text = Array.isArray(output) ? output[0]?.text : output?.text;

      self.postMessage({
        status: 'transcription_complete',
        text: text ? text.trim() : '',
      });
    } catch (err: any) {
      self.postMessage({
        status: 'error',
        error: err.message || 'Error occurred during on-device speech inference.',
      });
    }
  }
};

