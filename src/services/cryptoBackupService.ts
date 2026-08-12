/**
 * Service mã hóa file Backup dạng AES-GCM (256-bit) sử dụng Web Crypto API chuẩn trình duyệt/Electron
 */

async function getKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptBackupJSON(jsonStr: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(jsonStr);
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const key = await getKey(password, salt);
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    data
  );

  const encryptedArray = new Uint8Array(encryptedContent);
  const result = new Uint8Array(salt.length + iv.length + encryptedArray.length);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(encryptedArray, salt.length + iv.length);

  // Convert to Base64
  let binary = '';
  for (let i = 0; i < result.byteLength; i++) {
    binary += String.fromCharCode(result[i]);
  }
  return btoa(binary);
}

export async function decryptBackupJSON(base64Str: string, password: string): Promise<string> {
  const binary = atob(base64Str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const salt = bytes.slice(0, 16);
  const iv = bytes.slice(16, 28);
  const encryptedData = bytes.slice(28);

  const key = await getKey(password, salt);
  const decryptedContent = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encryptedData
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedContent);
}
