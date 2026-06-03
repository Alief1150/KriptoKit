"use client";

import { useMemo, useState } from "react";
import { base64ToBytes, bufferToBase64, decryptAes, encryptAes, fromHex, rot13, sha256Hex, bytesToUtf8, utf8ToBytes, toHex } from "@/lib/crypto";

type Mode = "aes" | "base64" | "sha256" | "rot13" | "hex";
type AesSubmode = "encrypt" | "decrypt";
type SimpleSubmode = "encode" | "decode";
type DragTarget = "target" | "reference" | "operation" | null;
type Tone = "neutral" | "valid" | "invalid";

const operations: Array<{ mode: Mode; label: string; meta: string }> = [
  { mode: "aes", label: "AES", meta: "encrypt / decrypt" },
  { mode: "base64", label: "Base64", meta: "encode / decode" },
  { mode: "sha256", label: "SHA-256", meta: "text hash" },
  { mode: "rot13", label: "ROT13", meta: "transform" },
  { mode: "hex", label: "Hexadecimal", meta: "encode / decode" },
];

const tickerItems = [
  "AES-GCM · local browser crypto",
  "Drag operation to unlock workflow",
  "SHA-256 verification · file compare",
  "Base64 encode / decode",
  "ROT13 transform · hex converter",
  "No backend · no upload · no page scroll",
  "Mas Bahlil Ganteng",
  "Prabowo dan Teddy",
  "Dihina-hina saya juga diam",
  "Tetapi hari ini SAYA AKAN LAWAN!",
];

const modeTitles: Record<Mode, { title: string; subtitle: string }> = {
  aes: { title: "AES Toolkit", subtitle: "Password-based AES-GCM demo. Encrypt outputs a JSON bundle; decrypt consumes the same package." },
  base64: { title: "Base64 Encoder / Decoder", subtitle: "Simple representation change for text. The panel stays fixed; only the recipe changes." },
  sha256: { title: "SHA-256 Text Hash", subtitle: "One-way hash generator for text. Small input changes should create different digests." },
  rot13: { title: "ROT13 Transformer", subtitle: "Lightweight letter rotation for quick reversible substitution demos." },
  hex: { title: "Hexadecimal Converter", subtitle: "Convert text to hex or decode hexadecimal back to text." },
};

function formatSize(file: File | null) {
  if (!file) return "No file selected";
  const size = file.size < 1024 ? `${file.size} B` : `${(file.size / 1024).toFixed(file.size > 1024 * 1024 ? 1 : 0)} KB`;
  return `${size} · ${file.type || "unknown type"}`;
}

async function readReferenceHash(file: File) {
  const text = await file.text();
  const cleaned = text.replace(/\s+/g, "").trim();
  const match = cleaned.match(/[a-fA-F0-9]{64}/);

  if (!match) {
    throw new Error("Reference TXT must contain a single SHA-256 hex string.");
  }

  return match[0].toLowerCase();
}

async function hashFile(file: File) {
  return toHex(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()));
}

export default function ClientShell() {
  const [search, setSearch] = useState("");
  const [activeMode, setActiveMode] = useState<Mode>("aes");
  const [aesSubmode, setAesSubmode] = useState<AesSubmode>("encrypt");
  const [base64Submode, setBase64Submode] = useState<SimpleSubmode>("encode");
  const [hexSubmode, setHexSubmode] = useState<SimpleSubmode>("encode");
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);

  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [targetHash, setTargetHash] = useState("");
  const [referenceHash, setReferenceHash] = useState("");
  const [verificationOutput, setVerificationOutput] = useState("");
  const [verificationTone, setVerificationTone] = useState<Tone>("neutral");
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [verificationResetKey, setVerificationResetKey] = useState(0);

  const [aesEncryptInput, setAesEncryptInput] = useState("");
  const [aesEncryptPassword, setAesEncryptPassword] = useState("");
  const [aesEncryptOutput, setAesEncryptOutput] = useState("");
  const [aesDecryptInput, setAesDecryptInput] = useState("");
  const [aesDecryptPassword, setAesDecryptPassword] = useState("");
  const [aesDecryptOutput, setAesDecryptOutput] = useState("");

  const [base64EncodeInput, setBase64EncodeInput] = useState("");
  const [base64EncodeOutput, setBase64EncodeOutput] = useState("");
  const [base64DecodeInput, setBase64DecodeInput] = useState("");
  const [base64DecodeOutput, setBase64DecodeOutput] = useState("");

  const [shaInput, setShaInput] = useState("");
  const [shaOutput, setShaOutput] = useState("");

  const [rot13Input, setRot13Input] = useState("");
  const [rot13Output, setRot13Output] = useState("");

  const [hexEncodeInput, setHexEncodeInput] = useState("");
  const [hexEncodeOutput, setHexEncodeOutput] = useState("");
  const [hexDecodeInput, setHexDecodeInput] = useState("");
  const [hexDecodeOutput, setHexDecodeOutput] = useState("");

  const filteredOperations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return operations;
    return operations.filter(({ mode, label, meta }) => [mode, label, meta].some((text) => text.toLowerCase().includes(q)));
  }, [search]);

  const activeOperation = modeTitles[activeMode];

  async function copyText(value: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore copy failure in demo mode
    }
  }

  function activateMode(mode: Mode) {
    setActiveMode(mode);
  }

  async function handleVerify() {
    if (!targetFile || !referenceFile) return;

    setVerificationBusy(true);
    setVerificationTone("neutral");
    setVerificationOutput("Reading files locally...\n");

    try {
      const computedTargetHash = await hashFile(targetFile);
      const parsedReferenceHash = await readReferenceHash(referenceFile);
      const valid = computedTargetHash === parsedReferenceHash;

      setTargetHash(computedTargetHash);
      setReferenceHash(parsedReferenceHash);
      setVerificationTone(valid ? "valid" : "invalid");
      setVerificationOutput(
        valid
          ? `Valid: SHA-256 target hash matches the reference hash.\n\nTarget: ${computedTargetHash}\nReference: ${parsedReferenceHash}`
          : `Invalid: SHA-256 target hash does not match the reference hash.\n\nTarget: ${computedTargetHash}\nReference: ${parsedReferenceHash}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Verification failed.";
      setVerificationTone("invalid");
      setVerificationOutput(message);
    } finally {
      setVerificationBusy(false);
    }
  }

  function clearVerification() {
    setTargetFile(null);
    setReferenceFile(null);
    setTargetHash("");
    setReferenceHash("");
    setVerificationOutput("");
    setVerificationTone("neutral");
    setVerificationBusy(false);
    setVerificationResetKey((current) => current + 1);
  }

  async function runAesEncrypt() {
    if (!aesEncryptInput.trim() || !aesEncryptPassword) {
      setAesEncryptOutput("Plaintext and password are required.");
      return;
    }

    try {
      setAesEncryptOutput(await encryptAes(aesEncryptInput, aesEncryptPassword));
    } catch (error) {
      setAesEncryptOutput(error instanceof Error ? error.message : "Encryption failed.");
    }
  }

  async function runAesDecrypt() {
    if (!aesDecryptInput.trim() || !aesDecryptPassword) {
      setAesDecryptOutput("Cipher bundle and password are required.");
      return;
    }

    try {
      setAesDecryptOutput(await decryptAes(aesDecryptInput, aesDecryptPassword));
    } catch (error) {
      setAesDecryptOutput(error instanceof Error ? error.message : "Decryption failed.");
    }
  }

  function runBase64Encode() {
    try {
      setBase64EncodeOutput(base64EncodeInput ? bufferToBase64(utf8ToBytes(base64EncodeInput)) : "");
    } catch (error) {
      setBase64EncodeOutput(error instanceof Error ? error.message : "Encode failed.");
    }
  }

  function runBase64Decode() {
    try {
      setBase64DecodeOutput(base64DecodeInput ? bytesToUtf8(base64ToBytes(base64DecodeInput)) : "");
    } catch (error) {
      setBase64DecodeOutput(error instanceof Error ? error.message : "Decode failed.");
    }
  }

  async function runSha() {
    try {
      setShaOutput(shaInput ? await sha256Hex(shaInput) : "");
    } catch (error) {
      setShaOutput(error instanceof Error ? error.message : "Hash failed.");
    }
  }

  function runRot13() {
    setRot13Output(rot13Input ? rot13(rot13Input) : "");
  }

  function runHexEncode() {
    try {
      setHexEncodeOutput(hexEncodeInput ? toHex(utf8ToBytes(hexEncodeInput).buffer) : "");
    } catch (error) {
      setHexEncodeOutput(error instanceof Error ? error.message : "Encode failed.");
    }
  }

  function runHexDecode() {
    try {
      setHexDecodeOutput(hexDecodeInput ? bytesToUtf8(fromHex(hexDecodeInput)) : "");
    } catch (error) {
      setHexDecodeOutput(error instanceof Error ? error.message : "Decode failed.");
    }
  }

  function onFileDrop(kind: "target" | "reference", file: File) {
    if (kind === "target") {
      setTargetFile(file);
    } else {
      setReferenceFile(file);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="ticker" aria-label="Technical status ticker">
          <div className="ticker__track">
            {[...tickerItems, ...tickerItems].map((item, index) => (
              <span className="ticker__item" key={`${item}-${index}`}>
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="brand brand--stacked">
          <div className="tiny">Kriptografi UAS · browser-side only</div>
          <h1>KriptoKit</h1>
        </div>
      </header>

      <section className="content-grid">
        <aside className="column">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Operations</h2>
                <p className="panel-subtitle">Drag mode ke workspace kanan atau klik untuk pindah mode. Search dipakai untuk menyaring mode dengan cepat.</p>
              </div>
            </div>

            <div className="sidebar-controls">
              <div className="search" role="search">
                <span className="tiny">Search</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} type="text" placeholder="AES, Base64, SHA-256, ROT13, Hex" aria-label="Search operation" />
              </div>

              <div className="op-list" id="operationList">
                {filteredOperations.map((operation) => (
                  <button
                    key={operation.mode}
                    className="op-card"
                    draggable
                    aria-pressed={activeMode === operation.mode}
                    type="button"
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", operation.mode);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                  >
                    <span className="op-card__label">{operation.label}</span>
                    <span className="op-card__meta">{operation.meta}</span>
                  </button>
                ))}
              </div>

              <div className="note">
                <strong>Pattern:</strong> pilih mode dengan drag ke panel kanan. <strong>Verification</strong> tetap tampil di tengah sebagai workflow hash compare.
              </div>
            </div>
          </section>
        </aside>

        <section className="column">
          <section className="panel verification-zone">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">SHA-256 Verification Tool</h2>
                <p className="panel-subtitle">Bandingkan hash SHA-256 file target dengan hash referensi dari file TXT. Status akan menunjukkan valid atau mismatch.</p>
              </div>
            </div>

            <div className="workspace">
              <div className="workspace-header">
                <div
                  className={`drop-hint${dragTarget === "target" ? " is-drag-over" : ""}`}
                  aria-label="Verification drop target"
                  tabIndex={0}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragTarget("target");
                  }}
                  onDragLeave={() => setDragTarget(null)}
                  onDrop={async (event) => {
                    event.preventDefault();
                    setDragTarget(null);
                    const file = event.dataTransfer.files?.[0];
                    if (file) onFileDrop("target", file);
                  }}
                >
                  <div>
                    <strong>Drop target file here</strong>
                    <div>Hitung SHA-256 dari file target, lalu cocokkan dengan hash pembanding.</div>
                  </div>
                </div>
              </div>

              <div className="verification-flow">
                <div className="status-grid">
                  <label
                    className={`file-box${dragTarget === "target" ? " is-drag-over" : ""}`}
                    data-file-drop="target"
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragTarget("target");
                    }}
                    onDragLeave={() => setDragTarget(null)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragTarget(null);
                      const file = event.dataTransfer.files?.[0];
                      if (file) onFileDrop("target", file);
                    }}
                  >
                    <span className="tiny">Target file</span>
                    <input key={`target-${verificationResetKey}`} type="file" onChange={(event) => setTargetFile(event.target.files?.[0] ?? null)} />
                    <div className="file-meta">
                      <span>{targetFile ? targetFile.name : "No file selected"}</span>
                      <span>{targetFile ? formatSize(targetFile) : "Select any file. The app only reads it locally."}</span>
                    </div>
                  </label>

                  <label
                    className={`file-box${dragTarget === "reference" ? " is-drag-over" : ""}`}
                    data-file-drop="reference"
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragTarget("reference");
                    }}
                    onDragLeave={() => setDragTarget(null)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragTarget(null);
                      const file = event.dataTransfer.files?.[0];
                      if (file) onFileDrop("reference", file);
                    }}
                  >
                    <span className="tiny">Reference hash TXT</span>
                    <input key={`reference-${verificationResetKey}`} type="file" accept=".txt,text/plain" onChange={(event) => setReferenceFile(event.target.files?.[0] ?? null)} />
                    <div className="file-meta">
                      <span>{referenceFile ? referenceFile.name : "No reference selected"}</span>
                      <span>TXT content should contain a single SHA-256 hex string.</span>
                    </div>
                  </label>
                </div>

                <div className="split-grid">
                  <div className="result-box">
                    <label htmlFor="targetHash">Computed target hash</label>
                    <textarea id="targetHash" readOnly value={targetHash} placeholder="Target hash will appear here" />
                  </div>
                  <div className="result-box">
                    <label htmlFor="referenceHash">Parsed reference hash</label>
                    <textarea id="referenceHash" readOnly value={referenceHash} placeholder="Reference hash will appear here" />
                  </div>
                </div>

                <div className="flex-between">
                <div className="inline-list">
                    <button className="action" type="button" onClick={handleVerify} disabled={verificationBusy || !targetFile || !referenceFile}>
                      {verificationBusy ? "Verifying..." : "Verify"}
                    </button>
                    <button
                      className="small-action"
                      type="button"
                      onClick={() => {
                        clearVerification();
                        setTargetFile(null);
                        setReferenceFile(null);
                      }}
                    >
                      Clear
                    </button>
                  </div>
                  <div className="result-chip" data-tone={verificationTone} aria-live="polite">
                    {verificationTone === "neutral" ? "Waiting for files" : verificationTone === "valid" ? "Valid" : "Mismatch"}
                  </div>
                </div>

                <div className="flow-box">
                  <label htmlFor="verificationOutput">Verification output</label>
                  <textarea id="verificationOutput" readOnly value={verificationOutput} placeholder="Valid / invalid status appears here" />
                </div>
              </div>
            </div>
          </section>
        </section>

        <section className="column">
          <section className="panel workspace">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Operation Workspace</h2>
                <p className="panel-subtitle">Drag operation here. The panel stays single-card; only the recipe and fields change with the active mode.</p>
              </div>
            </div>

            <div className="workspace-header">
              <div
                className={`drop-hint${dragTarget === "operation" ? " is-drag-over" : ""}`}
                aria-label="Operation drop zone"
                tabIndex={0}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragTarget("operation");
                }}
                onDragLeave={() => setDragTarget(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragTarget(null);
                  const mode = event.dataTransfer.getData("text/plain") as Mode;
                  if (modeTitles[mode]) setActiveMode(mode);
                }}
              >
                <div>
                  <strong>Drag operation here</strong>
                  <div>AES, Base64, SHA-256, ROT13, or Hexadecimal.</div>
                </div>
              </div>
            </div>

            <div className="mode-panel is-active">
              <div className="mode-panel__top">
                <div>
                  <h3 className="mode-panel__title">{activeOperation.title}</h3>
                  <p className="mode-panel__desc">{activeOperation.subtitle}</p>
                </div>

                {activeMode === "aes" || activeMode === "base64" || activeMode === "hex" ? (
                  <div className="toolbar" role="tablist" aria-label={`${activeMode.toUpperCase()} mode`}>
                    <label className="seg-toggle">
                      <input
                        type="radio"
                        name={`${activeMode}-submode`}
                        checked={activeMode === "aes" ? aesSubmode === "encrypt" : activeMode === "base64" ? base64Submode === "encode" : hexSubmode === "encode"}
                        onChange={() => {
                          if (activeMode === "aes") setAesSubmode("encrypt");
                          if (activeMode === "base64") setBase64Submode("encode");
                          if (activeMode === "hex") setHexSubmode("encode");
                        }}
                      />
                      <span className="seg-toggle__ui"><span>Encode /</span><span>Encrypt</span></span>
                    </label>

                    <label className="seg-toggle">
                      <input
                        type="radio"
                        name={`${activeMode}-submode`}
                        checked={activeMode === "aes" ? aesSubmode === "decrypt" : activeMode === "base64" ? base64Submode === "decode" : hexSubmode === "decode"}
                        onChange={() => {
                          if (activeMode === "aes") setAesSubmode("decrypt");
                          if (activeMode === "base64") setBase64Submode("decode");
                          if (activeMode === "hex") setHexSubmode("decode");
                        }}
                      />
                      <span className="seg-toggle__ui"><span>Decode /</span><span>Decrypt</span></span>
                    </label>
                  </div>
                ) : null}
              </div>

              {activeMode === "aes" ? (
                <div className="field-grid">
                  <div className="split-grid">
                    <label className="field">
                      <span className="tiny">Key / Password</span>
                      <input value={aesSubmode === "encrypt" ? aesEncryptPassword : aesDecryptPassword} onChange={(event) => (aesSubmode === "encrypt" ? setAesEncryptPassword(event.target.value) : setAesDecryptPassword(event.target.value))} type="password" placeholder="Secret key" />
                    </label>
                    <label className="field">
                      <span className="tiny">IV mode</span>
                      <input type="text" value={aesSubmode === "encrypt" ? "Random IV" : "From package"} readOnly />
                    </label>
                  </div>
                  <div className="split-grid">
                    <label className="field">
                      <span className="tiny">Mode</span>
                      <input type="text" value="GCM" readOnly />
                    </label>
                    <label className="field">
                      <span className="tiny">Input</span>
                      <input type="text" value={aesSubmode === "encrypt" ? "Raw plaintext" : "Cipher package"} readOnly />
                    </label>
                  </div>
                  <label className="field">
                    <span className="tiny">{aesSubmode === "encrypt" ? "Plaintext" : "Cipher package"}</span>
                    <textarea
                      rows={4}
                      value={aesSubmode === "encrypt" ? aesEncryptInput : aesDecryptInput}
                      onChange={(event) => (aesSubmode === "encrypt" ? setAesEncryptInput(event.target.value) : setAesDecryptInput(event.target.value))}
                      placeholder={aesSubmode === "encrypt" ? "Type plaintext to encrypt" : 'Paste JSON package from encrypt mode'}
                    />
                  </label>
                  <div className="mode-panel__actions">
                    <button className="action" type="button" onClick={aesSubmode === "encrypt" ? runAesEncrypt : runAesDecrypt}>
                      {aesSubmode === "encrypt" ? "Encrypt" : "Decrypt"}
                    </button>
                    <button className="copy-button" type="button" onClick={() => copyText(aesSubmode === "encrypt" ? aesEncryptOutput : aesDecryptOutput)} aria-label="Copy output">
                      <svg className="copy-button__icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M9 9V5.75C9 4.78 9.78 4 10.75 4h7.5c.97 0 1.75.78 1.75 1.75v7.5c0 .97-.78 1.75-1.75 1.75H15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M6.75 8h7.5c.97 0 1.75.78 1.75 1.75v7.5c0 .97-.78 1.75-1.75 1.75h-7.5A1.75 1.75 0 0 1 5 17.25v-7.5C5 8.78 5.78 8 6.75 8Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>Copy output</span>
                    </button>
                  </div>
                  <div className="result-box">
                    <label htmlFor={aesSubmode === "encrypt" ? "aesEncryptOutput" : "aesDecryptOutput"}>Output</label>
                    <textarea readOnly value={aesSubmode === "encrypt" ? aesEncryptOutput : aesDecryptOutput} placeholder={aesSubmode === "encrypt" ? "Ciphertext package appears here" : "Plaintext appears here"} />
                  </div>
                </div>
              ) : null}

              {activeMode === "base64" ? (
                <div className="field-grid">
                  <div className="split-grid">
                    <label className="field">
                      <span className="tiny">Alphabet</span>
                      <input type="text" value="A-Z a-z 0-9 + / =" readOnly />
                    </label>
                    <label className="field">
                      <span className="tiny">Input</span>
                      <input type="text" value={base64Submode === "encode" ? "Raw text" : "Base64"} readOnly />
                    </label>
                  </div>
                  <label className="field">
                    <span className="tiny">{base64Submode === "encode" ? "Text input" : "Input Base64"}</span>
                    <textarea
                      rows={4}
                      value={base64Submode === "encode" ? base64EncodeInput : base64DecodeInput}
                      onChange={(event) => (base64Submode === "encode" ? setBase64EncodeInput(event.target.value) : setBase64DecodeInput(event.target.value))}
                      placeholder={base64Submode === "encode" ? "Text to encode" : "Base64 string to decode"}
                    />
                  </label>
                  <div className="mode-panel__actions">
                    <button className="action" type="button" onClick={base64Submode === "encode" ? runBase64Encode : runBase64Decode}>
                      {base64Submode === "encode" ? "Encode" : "Decode"}
                    </button>
                    <button className="copy-button" type="button" onClick={() => copyText(base64Submode === "encode" ? base64EncodeOutput : base64DecodeOutput)} aria-label="Copy output">
                      <svg className="copy-button__icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M9 9V5.75C9 4.78 9.78 4 10.75 4h7.5c.97 0 1.75.78 1.75 1.75v7.5c0 .97-.78 1.75-1.75 1.75H15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M6.75 8h7.5c.97 0 1.75.78 1.75 1.75v7.5c0 .97-.78 1.75-1.75 1.75h-7.5A1.75 1.75 0 0 1 5 17.25v-7.5C5 8.78 5.78 8 6.75 8Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>Copy output</span>
                    </button>
                  </div>
                  <div className="result-box">
                    <label htmlFor={base64Submode === "encode" ? "base64EncodeOutput" : "base64DecodeOutput"}>Output</label>
                    <textarea readOnly value={base64Submode === "encode" ? base64EncodeOutput : base64DecodeOutput} placeholder={base64Submode === "encode" ? "Encoded output appears here" : "Decoded text appears here"} />
                  </div>
                </div>
              ) : null}

              {activeMode === "sha256" ? (
                <div className="field-grid">
                  <div className="split-grid">
                    <label className="field">
                      <span className="tiny">Size</span>
                      <input type="text" value="SHA-256" readOnly />
                    </label>
                    <label className="field">
                      <span className="tiny">Output</span>
                      <input type="text" value="Hex" readOnly />
                    </label>
                  </div>
                  <label className="field">
                    <span className="tiny">Plain text</span>
                    <textarea rows={4} value={shaInput} onChange={(event) => setShaInput(event.target.value)} placeholder="Type text to hash" />
                  </label>
                  <div className="mode-panel__actions">
                    <button className="action" type="button" onClick={runSha}>
                      Generate hash
                    </button>
                    <button className="copy-button" type="button" onClick={() => copyText(shaOutput)} aria-label="Copy output">
                      <svg className="copy-button__icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M9 9V5.75C9 4.78 9.78 4 10.75 4h7.5c.97 0 1.75.78 1.75 1.75v7.5c0 .97-.78 1.75-1.75 1.75H15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M6.75 8h7.5c.97 0 1.75.78 1.75 1.75v7.5c0 .97-.78 1.75-1.75 1.75h-7.5A1.75 1.75 0 0 1 5 17.25v-7.5C5 8.78 5.78 8 6.75 8Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>Copy output</span>
                    </button>
                  </div>
                  <div className="result-box">
                    <label htmlFor="shaOutput">Output</label>
                    <textarea readOnly value={shaOutput} placeholder="Hash appears here" />
                  </div>
                </div>
              ) : null}

              {activeMode === "rot13" ? (
                <div className="field-grid">
                  <div className="split-grid">
                    <label className="field">
                      <span className="tiny">Amount</span>
                      <input type="text" value="13" readOnly />
                    </label>
                    <label className="field">
                      <span className="tiny">Mode</span>
                      <input type="text" value="Rotate letters" readOnly />
                    </label>
                  </div>
                  <label className="field">
                    <span className="tiny">Text</span>
                    <textarea rows={4} value={rot13Input} onChange={(event) => setRot13Input(event.target.value)} placeholder="Enter text to transform" />
                  </label>
                  <div className="mode-panel__actions">
                    <button className="action" type="button" onClick={runRot13}>
                      Transform
                    </button>
                    <button className="copy-button" type="button" onClick={() => copyText(rot13Output)} aria-label="Copy output">
                      <svg className="copy-button__icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M9 9V5.75C9 4.78 9.78 4 10.75 4h7.5c.97 0 1.75.78 1.75 1.75v7.5c0 .97-.78 1.75-1.75 1.75H15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M6.75 8h7.5c.97 0 1.75.78 1.75 1.75v7.5c0 .97-.78 1.75-1.75 1.75h-7.5A1.75 1.75 0 0 1 5 17.25v-7.5C5 8.78 5.78 8 6.75 8Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>Copy output</span>
                    </button>
                  </div>
                  <div className="result-box">
                    <label htmlFor="rot13Output">Output</label>
                    <textarea readOnly value={rot13Output} placeholder="ROT13 output appears here" />
                  </div>
                </div>
              ) : null}

              {activeMode === "hex" ? (
                <div className="field-grid">
                  <div className="split-grid">
                    <label className="field">
                      <span className="tiny">Input</span>
                      <input type="text" value={hexSubmode === "encode" ? "Raw text" : "Hex"} readOnly />
                    </label>
                    <label className="field">
                      <span className="tiny">Output</span>
                      <input type="text" value={hexSubmode === "encode" ? "Hex" : "Raw text"} readOnly />
                    </label>
                  </div>
                  <label className="field">
                    <span className="tiny">{hexSubmode === "encode" ? "Text input" : "Hex input"}</span>
                    <textarea
                      rows={4}
                      value={hexSubmode === "encode" ? hexEncodeInput : hexDecodeInput}
                      onChange={(event) => (hexSubmode === "encode" ? setHexEncodeInput(event.target.value) : setHexDecodeInput(event.target.value))}
                      placeholder={hexSubmode === "encode" ? "Text to convert to hex" : "Hex string to decode"}
                    />
                  </label>
                  <div className="mode-panel__actions">
                    <button className="action" type="button" onClick={hexSubmode === "encode" ? runHexEncode : runHexDecode}>
                      {hexSubmode === "encode" ? "Encode" : "Decode"}
                    </button>
                    <button className="copy-button" type="button" onClick={() => copyText(hexSubmode === "encode" ? hexEncodeOutput : hexDecodeOutput)} aria-label="Copy output">
                      <svg className="copy-button__icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M9 9V5.75C9 4.78 9.78 4 10.75 4h7.5c.97 0 1.75.78 1.75 1.75v7.5c0 .97-.78 1.75-1.75 1.75H15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M6.75 8h7.5c.97 0 1.75.78 1.75 1.75v7.5c0 .97-.78 1.75-1.75 1.75h-7.5A1.75 1.75 0 0 1 5 17.25v-7.5C5 8.78 5.78 8 6.75 8Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>Copy output</span>
                    </button>
                  </div>
                  <div className="result-box">
                    <label htmlFor={hexSubmode === "encode" ? "hexEncodeOutput" : "hexDecodeOutput"}>Output</label>
                    <textarea readOnly value={hexSubmode === "encode" ? hexEncodeOutput : hexDecodeOutput} placeholder={hexSubmode === "encode" ? "Hex output appears here" : "Decoded text appears here"} />
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
