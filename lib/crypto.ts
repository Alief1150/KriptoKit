export function utf8ToBytes(text: string) {
  return new TextEncoder().encode(text);
}

export function bytesToUtf8(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes);
}

export function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function fromHex(text: string) {
  const cleaned = text.replace(/\s+/g, "").trim();

  if (!cleaned) {
    throw new Error("Hex input is empty.");
  }

  if (cleaned.length % 2 !== 0) {
    throw new Error("Hex string length must be even.");
  }

  const pairs = cleaned.match(/.{1,2}/g) ?? [];
  const values = pairs.map((pair) => Number.parseInt(pair, 16));

  if (values.some((value) => Number.isNaN(value))) {
    throw new Error("Invalid hexadecimal input.");
  }

  return new Uint8Array(values);
}

export function bufferToBase64(buffer: ArrayBuffer | Uint8Array) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

export function base64ToBytes(text: string) {
  const cleaned = text.replace(/\s+/g, "").trim();

  if (!cleaned) {
    throw new Error("Base64 input is empty.");
  }

  const binary = atob(cleaned);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", utf8ToBytes(text));
  return toHex(digest);
}

function deriveKey(password: string, salt: Uint8Array) {
  return crypto.subtle
    .importKey("raw", utf8ToBytes(password), "PBKDF2", false, ["deriveKey"])
    .then((material) =>
      crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: new Uint8Array(salt).buffer as ArrayBuffer,
          iterations: 100000,
          hash: "SHA-256",
        },
        material,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
      ),
    );
}

export async function encryptAes(plaintext: string, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, utf8ToBytes(plaintext));

  return JSON.stringify(
    {
      version: 1,
      algorithm: "AES-GCM",
      salt: bufferToBase64(salt),
      iv: bufferToBase64(iv),
      ciphertext: bufferToBase64(ciphertext),
    },
    null,
    2,
  );
}

export async function decryptAes(payload: string, password: string) {
  const parsed = JSON.parse(payload) as { salt: string; iv: string; ciphertext: string };
  const salt = base64ToBytes(parsed.salt);
  const iv = base64ToBytes(parsed.iv);
  const ciphertext = base64ToBytes(parsed.ciphertext);
  const key = await deriveKey(password, salt);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);

  return bytesToUtf8(new Uint8Array(plaintext));
}

export function rot13(text: string) {
  return text.replace(/[a-zA-Z]/g, (character) => {
    const base = character <= "Z" ? 65 : 97;
    return String.fromCharCode(((character.charCodeAt(0) - base + 13) % 26) + base);
  });
}
