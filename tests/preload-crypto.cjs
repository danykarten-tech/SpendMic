const crypto = require('node:crypto');
const v8 = require('node:v8');

if (!crypto.getRandomValues && crypto.webcrypto) {
  crypto.getRandomValues = crypto.webcrypto.getRandomValues.bind(crypto.webcrypto);
}
if (!globalThis.crypto) {
  globalThis.crypto = crypto.webcrypto || crypto;
}
if (!globalThis.crypto.getRandomValues && crypto.webcrypto) {
  globalThis.crypto.getRandomValues = crypto.webcrypto.getRandomValues.bind(crypto.webcrypto);
}

if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = function structuredClone(obj) {
    if (obj === undefined) return undefined;
    return v8.deserialize(v8.serialize(obj));
  };
}

if (typeof globalThis.DOMException === 'undefined') {
  globalThis.DOMException = class DOMException extends Error {
    constructor(message, name) {
      super(message);
      this.name = name || 'Error';
    }
  };
}

if (typeof Array.prototype.findLast !== 'function') {
  Array.prototype.findLast = function (predicate, thisArg) {
    for (let i = this.length - 1; i >= 0; i--) {
      if (predicate.call(thisArg, this[i], i, this)) {
        return this[i];
      }
    }
    return undefined;
  };
}

if (typeof Array.prototype.findLastIndex !== 'function') {
  Array.prototype.findLastIndex = function (predicate, thisArg) {
    for (let i = this.length - 1; i >= 0; i--) {
      if (predicate.call(thisArg, this[i], i, this)) {
        return i;
      }
    }
    return -1;
  };
}

require('fake-indexeddb/auto');
