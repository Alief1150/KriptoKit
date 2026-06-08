import forge from "node-forge";

export type AesAlgorithm = "AES-GCM" | "AES-CBC" | "AES-CFB";
export type AesEncoding = "utf8" | "hex" | "base64";
export type AesIvMode = "random" | "manual";

const AES_PBKDF2_ITERATIONS = 100000;
const AES_KEY_BYTES = 32;

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
  return forge.util.binary.base64.encode(bytes);
}

export function base64ToBytes(text: string) {
  const cleaned = text.replace(/\s+/g, "").trim();

  if (!cleaned) {
    throw new Error("Base64 input is empty.");
  }

  return forge.util.binary.base64.decode(cleaned);
}

export async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", utf8ToBytes(text));
  return toHex(digest);
}

function toForgeBuffer(bytes: Uint8Array) {
  return forge.util.createBuffer(forge.util.binary.raw.encode(bytes));
}

function fromForgeBytes(bytes: string) {
  return forge.util.binary.raw.decode(bytes);
}

function normalizeAlgorithm(algorithm?: string): AesAlgorithm {
  if (algorithm === "AES-CBC" || algorithm === "AES-CFB" || algorithm === "AES-GCM") return algorithm;
  return "AES-GCM";
}

function normalizeEncoding(encoding?: string): AesEncoding {
  if (encoding === "hex" || encoding === "base64" || encoding === "utf8") return encoding;
  return "utf8";
}

function ivLengthForAlgorithm(algorithm: AesAlgorithm) {
  return algorithm === "AES-GCM" ? 12 : 16;
}

function encodeByEncoding(bytes: Uint8Array, encoding: AesEncoding) {
  if (encoding === "utf8") return bytesToUtf8(bytes);
  if (encoding === "hex") return forge.util.bytesToHex(forge.util.binary.raw.encode(bytes));
  return bufferToBase64(bytes);
}

function decodeByEncoding(text: string, encoding: AesEncoding) {
  if (encoding === "utf8") return utf8ToBytes(text);
  if (encoding === "hex") return fromHex(text);
  return base64ToBytes(text);
}

function deriveKey(password: string, salt: Uint8Array) {
  const saltString = forge.util.binary.raw.encode(salt);
  const keyBytes = forge.pkcs5.pbkdf2(password, saltString, AES_PBKDF2_ITERATIONS, AES_KEY_BYTES, forge.md.sha256.create());
  return forge.util.createBuffer(keyBytes);
}

interface AesEncryptOptions {
  algorithm?: AesAlgorithm;
  inputEncoding?: AesEncoding;
  ivMode?: AesIvMode;
  ivEncoding?: AesEncoding;
  ivValue?: string;
}

interface AesBundleV2 {
  version: 2;
  algorithm: AesAlgorithm;
  salt: string;
  iv: string;
  ivMode: AesIvMode;
  ivEncoding: AesEncoding;
  inputEncoding: AesEncoding;
  ciphertext: string;
  tag?: string;
}

export interface DecryptAesResult {
  plaintext: string;
  algorithm: AesAlgorithm;
  inputEncoding: AesEncoding;
  ivEncoding: AesEncoding;
  ivMode: AesIvMode;
}

function encryptWithForge(algorithm: AesAlgorithm, key: forge.util.ByteBuffer, iv: Uint8Array, plaintext: Uint8Array) {
  const cipher = forge.cipher.createCipher(algorithm, key);
  const options = algorithm === "AES-GCM" ? { iv: toForgeBuffer(iv), tagLength: 128 } : { iv: toForgeBuffer(iv) };

  cipher.start(options);
  cipher.update(toForgeBuffer(plaintext));

  if (!cipher.finish()) {
    throw new Error("AES encryption failed.");
  }

  const ciphertext = fromForgeBytes(cipher.output.getBytes());
  const tag = algorithm === "AES-GCM" ? fromForgeBytes(cipher.mode.tag.getBytes()) : undefined;

  return { ciphertext, tag };
}

function decryptWithForge(algorithm: AesAlgorithm, key: forge.util.ByteBuffer, iv: Uint8Array, ciphertext: Uint8Array, tag?: Uint8Array) {
  const decipher = forge.cipher.createDecipher(algorithm, key);
  const options = algorithm === "AES-GCM"
    ? { iv: toForgeBuffer(iv), tagLength: 128, tag: tag ? toForgeBuffer(tag) : undefined }
    : { iv: toForgeBuffer(iv) };

  decipher.start(options);
  decipher.update(toForgeBuffer(ciphertext));

  if (!decipher.finish()) {
    throw new Error("AES decryption failed. Check the password, mode, or IV.");
  }

  return fromForgeBytes(decipher.output.getBytes());
}

function parseAesBundle(payload: string) {
  const parsed = JSON.parse(payload) as Partial<AesBundleV2> & { version?: number };

  return {
    version: parsed.version ?? 1,
    algorithm: normalizeAlgorithm(parsed.algorithm),
    ivEncoding: normalizeEncoding(parsed.ivEncoding),
    inputEncoding: normalizeEncoding(parsed.inputEncoding),
    ivMode: (parsed.ivMode ?? "random") as AesIvMode,
    salt: parsed.salt,
    iv: parsed.iv,
    ciphertext: parsed.ciphertext,
    tag: parsed.tag,
  };
}

export async function encryptAes(plaintext: string, password: string, options: AesEncryptOptions = {}) {
  const algorithm = normalizeAlgorithm(options.algorithm);
  const inputEncoding = normalizeEncoding(options.inputEncoding);
  const ivMode = options.ivMode ?? "random";
  const ivEncoding = normalizeEncoding(options.ivEncoding);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = ivMode === "random"
    ? crypto.getRandomValues(new Uint8Array(ivLengthForAlgorithm(algorithm)))
    : decodeByEncoding(options.ivValue ?? "", ivEncoding);

  if (iv.length !== ivLengthForAlgorithm(algorithm)) {
    throw new Error(`IV must be ${ivLengthForAlgorithm(algorithm)} bytes for ${algorithm}.`);
  }

  const key = deriveKey(password, salt);
  const plaintextBytes = decodeByEncoding(plaintext, inputEncoding);
  const { ciphertext, tag } = encryptWithForge(algorithm, key, iv, plaintextBytes);

  const bundle: AesBundleV2 = {
    version: 2,
    algorithm,
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    ivMode,
    ivEncoding,
    inputEncoding,
    ciphertext: bufferToBase64(ciphertext),
    ...(tag ? { tag: bufferToBase64(tag) } : {}),
  };

  return JSON.stringify(bundle, null, 2);
}

export async function decryptAes(payload: string, password: string): Promise<DecryptAesResult> {
  const parsed = parseAesBundle(payload);

  if (!parsed.salt || !parsed.iv || !parsed.ciphertext) {
    throw new Error("Invalid AES bundle.");
  }

  const salt = base64ToBytes(parsed.salt);
  const iv = base64ToBytes(parsed.iv);
  const ciphertext = base64ToBytes(parsed.ciphertext);
  const key = deriveKey(password, salt);
  let tag: Uint8Array | undefined;
  let payloadBytes = ciphertext;

  if (parsed.algorithm === "AES-GCM") {
    if (parsed.tag) {
      tag = base64ToBytes(parsed.tag);
    } else if (parsed.version === 1) {
      if (ciphertext.length < 16) {
        throw new Error("Invalid AES-GCM payload.");
      }

      tag = ciphertext.slice(ciphertext.length - 16);
      payloadBytes = ciphertext.slice(0, ciphertext.length - 16);
    } else {
      throw new Error("AES-GCM bundle is missing authentication tag.");
    }
  }

  const plaintextBytes = decryptWithForge(parsed.algorithm, key, iv, payloadBytes, tag);

  return {
    plaintext: encodeByEncoding(plaintextBytes, parsed.inputEncoding),
    algorithm: parsed.algorithm,
    inputEncoding: parsed.inputEncoding,
    ivEncoding: parsed.ivEncoding,
    ivMode: parsed.version === 1 ? "random" : parsed.ivMode ?? "random",
  };
}

export function rot13(text: string) {
  return text.replace(/[a-zA-Z]/g, (character) => {
    const base = character <= "Z" ? 65 : 97;
    return String.fromCharCode(((character.charCodeAt(0) - base + 13) % 26) + base);
  });
}
