import { webcrypto } from 'crypto';
const v8 = require('node:v8');

if (!globalThis.crypto || !globalThis.crypto.getRandomValues) {
  // @ts-ignore
  globalThis.crypto = webcrypto;
}
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = function structuredClone(obj) {
    if (obj === undefined) return undefined;
    return v8.deserialize(v8.serialize(obj));
  };
}

const originalEmit = process.emit;
// @ts-ignore
process.emit = function (event: string, ...args: any[]) {
  if (event === 'unhandledRejection') {
    const reason = args[0];
    if (
      reason &&
      (reason.name === 'AbortError' ||
        (reason.stack && (reason.stack.includes('FDBTransaction') || reason.stack.includes('FDBFactory'))))
    ) {
      return true;
    }
  }
  return originalEmit.apply(this, arguments as any);
};

import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';

if (typeof window !== 'undefined') {
  const idbGlobals = [
    'indexedDB',
    'IDBKeyRange',
    'IDBIndex',
    'IDBObjectStore',
    'IDBTransaction',
    'IDBCursor',
    'IDBRequest',
    'IDBOpenDBRequest',
    'IDBVersionChangeEvent',
    'IDBFactory',
    'IDBDatabase',
  ];
  for (const g of idbGlobals) {
    if ((globalThis as any)[g]) {
      (window as any)[g] = (globalThis as any)[g];
    }
  }
}
