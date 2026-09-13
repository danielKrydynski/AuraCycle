/**
 * @file crypto.ts
 * @description Zero-knowledge, client-side cryptographic engine powered by the browser's
 * native Web Crypto API (`window.crypto.subtle`).
 *
 * Security Architecture:
 * - Cipher: AES-256-GCM (Galois/Counter Mode) providing both confidentiality and integrity authentication.
 * - Key Derivation: PBKDF2 (Password-Based Key Derivation Function 2) with HMAC-SHA-256 and 100,000 iterations.
 * - Initialization Vector (IV): Cryptographically secure random 12-byte (96-bit) IV generated fresh for every encryption.
 * - Salt: Cryptographically secure random 16-byte (128-bit) salt per user vault to protect against rainbow table attacks.
 * - Zero Remote Transmission: No keys, plaintexts, or ciphertexts are ever sent across a network.
 */

import { EncryptedStore } from '../types';

/**
 * Encodes an ArrayBuffer into a standard Base64 string for persistent JSON storage.
 *
 * @param buffer - The raw binary ArrayBuffer to encode.
 * @returns Standard Base64 encoded string.
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Decodes a standard Base64 string back into an ArrayBuffer for Web Crypto API operations.
 *
 * @param base64 - Base64 string to decode.
 * @returns Binary ArrayBuffer containing the decoded bytes.
 */
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derives a 256-bit AES-GCM CryptoKey from a user passcode/PIN using PBKDF2.
 *
 * @param pin - The user-provided passcode or auto-generated device key.
 * @param saltBuffer - 16-byte cryptographic salt buffer.
 * @returns A CryptoKey suitable for AES-GCM encryption and decryption.
 */
export async function deriveKey(pin: string, saltBuffer: ArrayBuffer): Promise<CryptoKey> {
  const enc = new TextEncoder();
  // Import the raw PIN as key material for PBKDF2
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Derive an AES-GCM 256-bit key with 100,000 SHA-256 rounds
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Computes a salted cryptographic hash of the passcode for rapid offline validation.
 *
 * @param pin - The user-provided passcode.
 * @param saltBase64 - Base64-encoded salt string.
 * @returns Base64-encoded 256-bit derived hash.
 */
export async function hashPin(pin: string, saltBase64: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = base64ToBuffer(saltBase64);
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const bits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return bufferToBase64(bits);
}

/**
 * Encrypts arbitrary serializable data using AES-256-GCM and packages it into an `EncryptedStore`.
 *
 * @param data - Any JSON-serializable object (typically `AppData`).
 * @param pin - The passcode or device key used for key derivation.
 * @param existingSalt - Optional existing salt to maintain derivation consistency across edits.
 * @returns Promise resolving to the complete `EncryptedStore` structure with Base64 payloads.
 */
export async function encryptData(
  data: unknown,
  pin: string,
  existingSalt?: string
): Promise<EncryptedStore> {
  // Use existing salt or generate 16 cryptographically secure random bytes
  const saltBuffer = existingSalt
    ? base64ToBuffer(existingSalt)
    : window.crypto.getRandomValues(new Uint8Array(16)).buffer;

  // Generate a fresh 12-byte (96-bit) IV for each encryption to ensure GCM security
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Derive key via PBKDF2
  const key = await deriveKey(pin, saltBuffer);

  // Serialize and encode payload
  const jsonString = JSON.stringify(data);
  const encodedData = new TextEncoder().encode(jsonString);

  // Encrypt with AES-GCM (produces ciphertext + 128-bit authentication tag)
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encodedData
  );

  return {
    version: 1,
    salt: bufferToBase64(saltBuffer),
    iv: bufferToBase64(iv.buffer),
    ciphertext: bufferToBase64(ciphertextBuffer),
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Decrypts an `EncryptedStore` container using the provided passcode.
 * Throws a DOMException (OperationError) if the passcode is incorrect or ciphertext has been tampered with.
 *
 * @template T - Expected type of the decrypted object.
 * @param store - The `EncryptedStore` holding the salt, IV, and authenticated ciphertext.
 * @param pin - Passcode or device key.
 * @returns Promise resolving to the parsed data object of type `T`.
 * @throws Error if key derivation or authentication tag verification fails.
 */
export async function decryptData<T = unknown>(store: EncryptedStore, pin: string): Promise<T> {
  const saltBuffer = base64ToBuffer(store.salt);
  const ivBuffer = base64ToBuffer(store.iv);
  const ciphertextBuffer = base64ToBuffer(store.ciphertext);

  const key = await deriveKey(pin, saltBuffer);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(ivBuffer),
    },
    key,
    ciphertextBuffer
  );

  const decodedString = new TextDecoder().decode(decryptedBuffer);
  return JSON.parse(decodedString) as T;
}

/**
 * Generates a high-entropy 192-bit (24-byte) random device key.
 * Used when the user elects not to set a manual PIN while maintaining full AES-256 local encryption.
 *
 * @returns Base64-encoded device key string.
 */
export function generateDeviceKey(): string {
  const array = new Uint8Array(24);
  window.crypto.getRandomValues(array);
  return bufferToBase64(array.buffer);
}

/**
 * Triggers a secure client-side file download without server involvement.
 *
 * @param content - Text/string content to save.
 * @param filename - Target filename (e.g. `cycle_vault_backup.json`).
 * @param mimeType - MIME type header (default: `application/json`).
 */
export function downloadFile(content: string, filename: string, mimeType = 'application/json'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
