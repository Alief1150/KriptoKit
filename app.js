const state = {
  mode: "aes",
  aesTab: "encrypt",
  base64Tab: "encode",
  hexTab: "encode",
  verification: {
    targetFile: null,
    referenceFile: null,
    targetHash: "",
    referenceHash: "",
  },
};

const nodes = {
  searchInput: document.getElementById("searchInput"),
  operationList: document.getElementById("operationList"),
  operationDrop: document.getElementById("operationDrop"),
  operationWorkspace: document.querySelector('[data-workspace="operations"]'),
  fileDropBoxes: [...document.querySelectorAll("[data-file-drop]")],
  modePanels: [...document.querySelectorAll("[data-mode-panel]")],
  verificationDrop: document.getElementById("verificationDrop"),
  targetFile: document.getElementById("targetFile"),
  referenceFile: document.getElementById("referenceFile"),
  targetMetaName: document.getElementById("targetMetaName"),
  targetMetaInfo: document.getElementById("targetMetaInfo"),
  referenceMetaName: document.getElementById("referenceMetaName"),
  referenceMetaInfo: document.getElementById("referenceMetaInfo"),
  targetHash: document.getElementById("targetHash"),
  referenceHash: document.getElementById("referenceHash"),
  verifyButton: document.getElementById("verifyButton"),
  clearVerificationButton: document.getElementById("clearVerificationButton"),
  verificationStatus: document.getElementById("verificationStatus"),
  verificationOutput: document.getElementById("verificationOutput"),
};

const opLabels = {
  aes: { title: "AES", subtitle: "Encrypt / decrypt" },
  base64: { title: "Base64", subtitle: "Encode / decode" },
  sha256: { title: "SHA-256", subtitle: "Text hash" },
  rot13: { title: "ROT13", subtitle: "Transform" },
  hex: { title: "Hexadecimal", subtitle: "Encode / decode" },
};

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function fromHex(text) {
  const cleaned = text.replace(/\s+/g, "").trim();
  if (cleaned.length % 2 !== 0) throw new Error("Hex string length must be even.");
  const bytes = cleaned.match(/.{1,2}/g)?.map((pair) => Number.parseInt(pair, 16));
  if (!bytes || bytes.some((value) => Number.isNaN(value))) throw new Error("Invalid hexadecimal input.");
  return new Uint8Array(bytes);
}

function utf8ToBytes(text) {
  return new TextEncoder().encode(text);
}

function bytesToUtf8(bytes) {
  return new TextDecoder().decode(bytes);
}

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBuffer(text) {
  const binary = atob(text.replace(/\s+/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return bytes;
}

async function sha256(text) {
  const digest = await crypto.subtle.digest("SHA-256", utf8ToBytes(text));
  return toHex(digest);
}

function rot13(text) {
  return text.replace(/[a-zA-Z]/g, (character) => {
    const base = character <= "Z" ? 65 : 97;
    return String.fromCharCode(((character.charCodeAt(0) - base + 13) % 26) + base);
  });
}

async function deriveAesKey(password, salt) {
  const material = await crypto.subtle.importKey("raw", utf8ToBytes(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptAes(plaintext, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, utf8ToBytes(plaintext));

  return JSON.stringify({
    version: 1,
    algorithm: "AES-GCM",
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(ciphertext),
  }, null, 2);
}

async function decryptAes(payload, password) {
  const parsed = JSON.parse(payload);
  const salt = base64ToBuffer(parsed.salt);
  const iv = base64ToBuffer(parsed.iv);
  const ciphertext = base64ToBuffer(parsed.ciphertext);
  const key = await deriveAesKey(password, salt);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return bytesToUtf8(new Uint8Array(plaintext));
}

function setActiveMode(mode) {
  state.mode = mode;

  nodes.modePanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.modePanel === mode);
  });

  nodes.operationList.querySelectorAll(".op-card").forEach((button) => {
    const active = button.dataset.mode === mode;
    button.setAttribute("aria-pressed", String(active));
    button.classList.toggle("is-active", active);
  });
}

function setAesTab(tab) {
  state.aesTab = tab;
  document.querySelectorAll("[data-aes-tab]").forEach((button) => {
    const active = button.dataset.aesTab === tab;
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelector('[data-aes-form="encrypt"]').classList.toggle("hidden", tab !== "encrypt");
  document.querySelector('[data-aes-form="decrypt"]').classList.toggle("hidden", tab !== "decrypt");
}

function setBase64Tab(tab) {
  state.base64Tab = tab;
  document.querySelectorAll("[data-base64-tab]").forEach((button) => {
    const active = button.dataset.base64Tab === tab;
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelector('[data-base64-form="encode"]').classList.toggle("hidden", tab !== "encode");
  document.querySelector('[data-base64-form="decode"]').classList.toggle("hidden", tab !== "decode");
}

function setHexTab(tab) {
  state.hexTab = tab;
  document.querySelectorAll("[data-hex-tab]").forEach((button) => {
    const active = button.dataset.hexTab === tab;
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelector('[data-hex-form="encode"]').classList.toggle("hidden", tab !== "encode");
  document.querySelector('[data-hex-form="decode"]').classList.toggle("hidden", tab !== "decode");
}

function formatFileMeta(file) {
  if (!file) return { name: "No file selected", info: "Select any file. The app only reads it locally." };
  const kb = (file.size / 1024).toFixed(file.size > 1024 * 1024 ? 1 : 0);
  const sizeLabel = file.size < 1024 ? `${file.size} B` : `${kb} KB`;
  return { name: file.name, info: `${sizeLabel} · ${file.type || "unknown type"}` };
}

async function readReferenceHash(file) {
  const text = await file.text();
  const cleaned = text.replace(/\s+/g, "").trim();
  const match = cleaned.match(/[a-fA-F0-9]{64}/);
  if (!match) throw new Error("Reference TXT must contain a single SHA-256 hex string.");
  return match[0].toLowerCase();
}

async function readTargetHash(file) {
  const buffer = await file.arrayBuffer();
  return toHex(await crypto.subtle.digest("SHA-256", buffer));
}

async function updateVerificationPreview() {
  const { targetFile, referenceFile } = state.verification;

  nodes.targetMetaName.textContent = formatFileMeta(targetFile).name;
  nodes.targetMetaInfo.textContent = formatFileMeta(targetFile).info;
  nodes.referenceMetaName.textContent = formatFileMeta(referenceFile).name;
  nodes.referenceMetaInfo.textContent = formatFileMeta(referenceFile).info;

  nodes.verifyButton.disabled = !targetFile || !referenceFile;
}

function setVerificationStatus(text, tone = "neutral") {
  nodes.verificationStatus.textContent = text;
  nodes.verificationStatus.dataset.tone = tone;
}

function clearVerification() {
  state.verification.targetFile = null;
  state.verification.referenceFile = null;
  state.verification.targetHash = "";
  state.verification.referenceHash = "";
  nodes.targetFile.value = "";
  nodes.referenceFile.value = "";
  nodes.targetHash.value = "";
  nodes.referenceHash.value = "";
  nodes.verificationOutput.value = "";
  setVerificationStatus("Waiting for files", "neutral");
  updateVerificationPreview();
}

async function setVerificationFile(kind, file) {
  if (kind === "target") {
    state.verification.targetFile = file;
    state.verification.targetHash = "";
    nodes.targetHash.value = "";
  }

  if (kind === "reference") {
    state.verification.referenceFile = file;
    state.verification.referenceHash = "";
    nodes.referenceHash.value = "";
  }

  await updateVerificationPreview();
}

async function runVerification() {
  if (!state.verification.targetFile || !state.verification.referenceFile) return;

  setVerificationStatus("Computing hash...", "neutral");
  nodes.verificationOutput.value = "Reading files locally.\n";

  try {
    const targetHash = await readTargetHash(state.verification.targetFile);
    const referenceHash = await readReferenceHash(state.verification.referenceFile);

    state.verification.targetHash = targetHash;
    state.verification.referenceHash = referenceHash;

    nodes.targetHash.value = targetHash;
    nodes.referenceHash.value = referenceHash;

    const valid = targetHash === referenceHash;
    setVerificationStatus(valid ? "Valid" : "Mismatch", valid ? "valid" : "invalid");
    nodes.verificationOutput.value = valid
      ? `Valid: SHA-256 target hash matches the reference hash.\n\nTarget: ${targetHash}\nReference: ${referenceHash}`
      : `Invalid: SHA-256 target hash does not match the reference hash.\n\nTarget: ${targetHash}\nReference: ${referenceHash}`;
  } catch (error) {
    setVerificationStatus("Invalid reference", "invalid");
    nodes.verificationOutput.value = error instanceof Error ? error.message : "Verification failed.";
  }
}

function attachCopyButtons() {
  document.querySelectorAll("[data-copy-target]").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = document.getElementById(button.dataset.copyTarget);
      if (!(target instanceof HTMLTextAreaElement)) return;
      try {
        await navigator.clipboard.writeText(target.value || "");
        button.textContent = "Copied";
        window.setTimeout(() => {
          button.textContent = "Copy output";
        }, 1200);
      } catch {
        button.textContent = "Copy failed";
        window.setTimeout(() => {
          button.textContent = "Copy output";
        }, 1200);
      }
    });
  });
}

function attachSearch() {
  nodes.searchInput.addEventListener("input", () => {
    const query = nodes.searchInput.value.trim().toLowerCase();
    nodes.operationList.querySelectorAll(".op-card").forEach((button) => {
      const label = button.dataset.mode;
      const text = button.textContent.toLowerCase();
      const visible = !query || label.includes(query) || text.includes(query);
      button.classList.toggle("hidden", !visible);
    });
  });
}

function attachOperationDragAndDrop() {
  nodes.operationList.addEventListener("dragstart", (event) => {
    const target = event.target.closest(".op-card");
    if (!target) return;
    event.dataTransfer.setData("text/plain", target.dataset.mode);
    event.dataTransfer.effectAllowed = "move";
  });

  nodes.operationList.addEventListener("click", (event) => {
    const target = event.target.closest(".op-card");
    if (!target) return;
    setActiveMode(target.dataset.mode);
  });

  [nodes.operationDrop, nodes.operationWorkspace].forEach((dropZone) => {
    dropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropZone.classList.add("is-drag-over");
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("is-drag-over");
    });

    dropZone.addEventListener("drop", (event) => {
      event.preventDefault();
      dropZone.classList.remove("is-drag-over");
      const mode = event.dataTransfer.getData("text/plain");
      if (opLabels[mode]) setActiveMode(mode);
    });
  });
}

function attachVerification() {
  nodes.targetFile.addEventListener("change", async () => {
    await setVerificationFile("target", nodes.targetFile.files?.[0] ?? null);
  });

  nodes.referenceFile.addEventListener("change", async () => {
    await setVerificationFile("reference", nodes.referenceFile.files?.[0] ?? null);
  });

  nodes.clearVerificationButton.addEventListener("click", clearVerification);
  nodes.verifyButton.addEventListener("click", runVerification);

  nodes.verificationDrop.addEventListener("dragover", (event) => {
    event.preventDefault();
    nodes.verificationDrop.classList.add("is-drag-over");
  });

  nodes.verificationDrop.addEventListener("dragleave", () => {
    nodes.verificationDrop.classList.remove("is-drag-over");
  });

  nodes.verificationDrop.addEventListener("drop", async (event) => {
    event.preventDefault();
    nodes.verificationDrop.classList.remove("is-drag-over");
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await setVerificationFile("target", file);
  });

  nodes.fileDropBoxes.forEach((box) => {
    box.addEventListener("dragover", (event) => {
      event.preventDefault();
      box.classList.add("is-drag-over");
    });

    box.addEventListener("dragleave", () => {
      box.classList.remove("is-drag-over");
    });

    box.addEventListener("drop", async (event) => {
      event.preventDefault();
      box.classList.remove("is-drag-over");
      const file = event.dataTransfer.files?.[0];
      if (!file) return;
      await setVerificationFile(box.dataset.fileDrop, file);
    });
  });
}

function attachAesControls() {
  document.querySelectorAll("[data-aes-tab]").forEach((button) => {
    button.addEventListener("click", () => setAesTab(button.dataset.aesTab));
  });

  document.getElementById("aesEncryptButton").addEventListener("click", async () => {
    const input = document.getElementById("aesEncryptInput").value;
    const password = document.getElementById("aesEncryptPassword").value;
    const output = document.getElementById("aesEncryptOutput");
    if (!input.trim() || !password) {
      output.value = "Plaintext and password are required.";
      return;
    }
    try {
      output.value = await encryptAes(input, password);
    } catch (error) {
      output.value = error instanceof Error ? error.message : "Encryption failed.";
    }
  });

  document.getElementById("aesDecryptButton").addEventListener("click", async () => {
    const input = document.getElementById("aesDecryptInput").value;
    const password = document.getElementById("aesDecryptPassword").value;
    const output = document.getElementById("aesDecryptOutput");
    if (!input.trim() || !password) {
      output.value = "Cipher bundle and password are required.";
      return;
    }
    try {
      output.value = await decryptAes(input, password);
    } catch (error) {
      output.value = error instanceof Error ? error.message : "Decryption failed.";
    }
  });
}

function attachBase64Controls() {
  document.querySelectorAll("[data-base64-tab]").forEach((button) => {
    button.addEventListener("click", () => setBase64Tab(button.dataset.base64Tab));
  });

  document.getElementById("base64EncodeButton").addEventListener("click", () => {
    const input = document.getElementById("base64EncodeInput").value;
    const output = document.getElementById("base64EncodeOutput");
    try {
      output.value = input ? bufferToBase64(utf8ToBytes(input)) : "";
    } catch (error) {
      output.value = error instanceof Error ? error.message : "Encode failed.";
    }
  });

  document.getElementById("base64DecodeButton").addEventListener("click", () => {
    const input = document.getElementById("base64DecodeInput").value;
    const output = document.getElementById("base64DecodeOutput");
    try {
      output.value = input ? bytesToUtf8(base64ToBuffer(input)) : "";
    } catch (error) {
      output.value = error instanceof Error ? error.message : "Decode failed.";
    }
  });
}

function attachShaControls() {
  document.getElementById("shaButton").addEventListener("click", async () => {
    const input = document.getElementById("shaInput").value;
    const output = document.getElementById("shaOutput");
    try {
      output.value = input ? await sha256(input) : "";
    } catch (error) {
      output.value = error instanceof Error ? error.message : "Hash failed.";
    }
  });
}

function attachRot13Controls() {
  document.getElementById("rot13Button").addEventListener("click", () => {
    const input = document.getElementById("rot13Input").value;
    const output = document.getElementById("rot13Output");
    output.value = input ? rot13(input) : "";
  });
}

function attachHexControls() {
  document.querySelectorAll("[data-hex-tab]").forEach((button) => {
    button.addEventListener("click", () => setHexTab(button.dataset.hexTab));
  });

  document.getElementById("hexEncodeButton").addEventListener("click", () => {
    const input = document.getElementById("hexEncodeInput").value;
    const output = document.getElementById("hexEncodeOutput");
    output.value = input
      ? [...utf8ToBytes(input)].map((value) => value.toString(16).padStart(2, "0")).join("")
      : "";
  });

  document.getElementById("hexDecodeButton").addEventListener("click", () => {
    const input = document.getElementById("hexDecodeInput").value;
    const output = document.getElementById("hexDecodeOutput");
    try {
      output.value = input ? bytesToUtf8(fromHex(input)) : "";
    } catch (error) {
      output.value = error instanceof Error ? error.message : "Decode failed.";
    }
  });
}

function init() {
  setActiveMode("aes");
  setAesTab("encrypt");
  setBase64Tab("encode");
  setHexTab("encode");
  updateVerificationPreview();

  attachSearch();
  attachOperationDragAndDrop();
  attachVerification();
  attachAesControls();
  attachBase64Controls();
  attachShaControls();
  attachRot13Controls();
  attachHexControls();
  attachCopyButtons();
}

init();
