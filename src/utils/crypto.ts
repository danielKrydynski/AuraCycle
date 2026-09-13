/**
 * Client-side AES-256 GCM Web Crypto Implementation
 * All data is encrypted locally on-device. Zero data is sent to any server.
 */

import { EncryptedStore } from '../types';

// Convert ArrayBuffer to Base64
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Convert Base64 to ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Derive AES-GCM 256-bit key from a passcode/PIN and salt using PBKDF2
export async function deriveKey(pin: string, saltBuffer: ArrayBuffer): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

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

// Hash PIN for fast verification check
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

// Encrypt plaintext data using AES-GCM
export async function encryptData(data: unknown, pin: string, existingSalt?: string): Promise<EncryptedStore> {
  const saltBuffer = existingSalt ? base64ToBuffer(existingSalt) : window.crypto.getRandomValues(new Uint8Array(16)).buffer;
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, saltBuffer);

  const jsonString = JSON.stringify(data);
  const encodedData = new TextEncoder().encode(jsonString);

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

// Decrypt AES-GCM data using PIN. Throws error if PIN is invalid.
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

// Generate a random high-entropy device key if user opts for no PIN
export function generateDeviceKey(): string {
  const array = new Uint8Array(24);
  window.crypto.getRandomValues(array);
  return bufferToBase64(array.buffer);
}

// File export helper
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
