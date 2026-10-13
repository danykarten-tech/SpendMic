interface OfflineTokenPayload {
  authorized: boolean;
  expiresAt: number;
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/** Verifies the server's Ed25519 signature without putting a private key in the app. */
export async function verifyOfflineAuthorizationToken(token?: string): Promise<boolean> {
  const publicKey = import.meta.env.VITE_LICENSE_PUBLIC_KEY;
  if (!token || !publicKey || !globalThis.crypto?.subtle) return false;
  const [payloadPart, signaturePart] = token.split('.');
  if (!payloadPart || !signaturePart) return false;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadPart))) as OfflineTokenPayload;
    if (payload.authorized !== true || payload.expiresAt <= Date.now()) return false;
    const key = await crypto.subtle.importKey('spki', toArrayBuffer(base64UrlToBytes(publicKey)), { name: 'Ed25519' }, false, ['verify']);
    return crypto.subtle.verify({ name: 'Ed25519' }, key, toArrayBuffer(base64UrlToBytes(signaturePart)), new TextEncoder().encode(payloadPart));
  } catch {
    return false;
  }
}
