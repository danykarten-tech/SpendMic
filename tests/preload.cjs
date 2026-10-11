const crypto = require('crypto');

if (!crypto.getRandomValues && crypto.webcrypto) {
  crypto.getRandomValues = crypto.webcrypto.getRandomValues.bind(crypto.webcrypto);
}

if (!globalThis.crypto) {
  globalThis.crypto = crypto.webcrypto;
}

if (typeof globalThis.DOMException === 'undefined') {
  class DOMException extends Error {
    constructor(message, name) {
      super(message);
      this.name = name || 'Error';
    }
  }
  globalThis.DOMException = DOMException;
  global.DOMException = DOMException;
}
