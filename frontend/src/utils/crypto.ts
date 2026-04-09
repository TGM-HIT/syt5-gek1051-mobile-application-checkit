/**
 * crypto.ts — AES-GCM-256 encryption for sensitive user fields (e.g. email).
 *
 * Key derivation: PBKDF2(app-pepper + per-field salt, 200 000 iterations, SHA-256)
 * Cipher: AES-GCM-256 with a random 96-bit IV per encryption.
 *
 * All binary data is stored as base64 strings so it can be kept in localStorage.
 */

const APP_SECRET = import.meta.env.VITE_PEPPER ?? 'checkit-default-secret';

function toBase64(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes));
}

/** Decode base64 → fresh ArrayBuffer (never SharedArrayBuffer). */
function b64ToBuffer(b64: string): ArrayBuffer {
    const decoded = atob(b64);
    const buf     = new ArrayBuffer(decoded.length);
    const view    = new Uint8Array(buf);
    for (let i = 0; i < decoded.length; i++) view[i] = decoded.charCodeAt(i);
    return buf;
}

/** Encode a string → fresh ArrayBuffer. */
function strToBuffer(s: string): ArrayBuffer {
    const encoded = new TextEncoder().encode(s);
    const buf     = new ArrayBuffer(encoded.length);
    new Uint8Array(buf).set(encoded);
    return buf;
}

/** Allocate n random bytes in a fresh ArrayBuffer. */
function randomBuffer(n: number): { buffer: ArrayBuffer; view: Uint8Array } {
    const buffer = new ArrayBuffer(n);
    const view   = new Uint8Array(buffer);
    crypto.getRandomValues(view);
    return { buffer, view };
}

async function deriveKey(saltBuffer: ArrayBuffer): Promise<CryptoKey> {
    const raw = await crypto.subtle.importKey('raw', strToBuffer(APP_SECRET), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: saltBuffer, iterations: 200_000, hash: 'SHA-256' },
        raw,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
}

/** Encrypt a plaintext string. Returns the ciphertext, IV and salt as base64 strings. */
export async function encryptField(plaintext: string): Promise<{ encrypted: string; iv: string; salt: string }> {
    const { buffer: saltBuf, view: saltView } = randomBuffer(16);
    const { buffer: ivBuf,   view: ivView   } = randomBuffer(12);
    const key       = await deriveKey(saltBuf);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivBuf }, key, strToBuffer(plaintext));

    return {
        encrypted: toBase64(new Uint8Array(ciphertext)),
        iv:        toBase64(ivView),
        salt:      toBase64(saltView),
    };
}

/** Decrypt a field that was encrypted with {@link encryptField}. */
export async function decryptField(encrypted: string, iv: string, salt: string): Promise<string> {
    const key       = await deriveKey(b64ToBuffer(salt));
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBuffer(iv) }, key, b64ToBuffer(encrypted));
    return new TextDecoder().decode(decrypted);
}
