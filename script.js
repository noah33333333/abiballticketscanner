// Passwort hier ändern
const PASSWORD = "abi2026";

let tickets = [];
let scannedCodes = new Set();
let scanLog = [];
let html5QrCode = null;
let lastScan = "";
let lastScanTime = 0;

const STORAGE_KEY = "ticketScannerFakeBackendV3_idOnly";

const loginScreen = document.getElementById("loginScreen");
const scannerScreen = document.getElementById("scannerScreen");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginError = document.getElementById("loginError");
const fileInput = document.getElementById("fileInput");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const exportBtn = document.getElementById("exportBtn");
const resetBtn = document.getElementById("resetBtn");
const manualInput = document.getElementById("manualInput");
const manualBtn = document.getElementById("manualBtn");

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ tickets, scannedCodes: Array.from(scannedCodes), scanLog }));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    const state = JSON.parse(saved);
    tickets = state.tickets || [];
    scannedCodes = new Set(state.scannedCodes || []);
    scanLog = state.scanLog || [];
    updateCounter();
    updateStats();
  } catch (e) {
    console.error("Speicherstand konnte nicht geladen werden", e);
  }
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeCode(code) {
  return normalizeText(code).toLowerCase();
}

function extractTicketIdFromScan(rawCode) {
  const text = normalizeText(rawCode);
  if (!text) return "";

  // Falls doch noch ein alter Code wie vorname_nachname_12345 gescannt wird,
  // wird automatisch der letzte Teil als ID genommen.
  if (text.includes("_")) {
    const parts = text.split("_").filter(Boolean);
    return normalizeText(parts[parts.length - 1]);
  }

  return text;
}

function normalizeId(id) {
  return normalizeText(id).toLowerCase();
}

function isProbablyHeader(name, id) {
  const n = normalizeText(name).toLowerCase();
  const i = normalizeText(id).toLowerCase();
  return (n.includes("name") || n.includes("vorname") || n.includes("nachname")) && (i === "id" || i.includes("ticket"));
}

function rowsToTickets(rows) {
  // Deine Excel-Struktur:
  // Spalte A = Vorname Nachname
  // Spalte B = egal / irrelevant
  // Spalte C = Ticket-ID
  return rows.map((row, index) => {
    const fullName = normalizeText(row[0]);
    const ticketid = normalizeText(row[2]);

    return {
      id: ticketid,
      code: ticketid,
      name: fullName || `Ticket ${ticketid}`,
      scanned: false,
      scannedAt: null,
      row: index + 1
    };
  }).filter(t => t.id && !isProbablyHeader(t.name, t.id));
}

function findTicket(scannedText) {
  const scannedId = normalizeId(extractTicketIdFromScan(scannedText));
  return tickets.find(ticket => normalizeId(ticket.id || ticket.code) === scannedId);
}

function handleScan(rawCode) {
  const code = normalizeText(rawCode);
  const scannedId = extractTicketIdFromScan(code);
  if (!scannedId) return;

  const now = Date.now();
  if (scannedId === lastScan && now - lastScanTime < 2000) return;
  lastScan = scannedId;
  lastScanTime = now;

  const ticket = findTicket(code);

  if (!ticket) {
    scanLog.push({ id: scannedId, code, status: "invalid", scannedAt: new Date().toISOString() });
    showResult("❌ Ungültig", `Nicht in der Liste: ${scannedId}`, "bad");
    updateStats();
    saveState();
    return;
  }

  const normalized = normalizeId(ticket.id || ticket.code);

  if (scannedCodes.has(normalized) || ticket.scanned === true) {
    scanLog.push({ id: ticket.id, code: ticket.code, name: ticket.name, status: "duplicate", scannedAt: new Date().toISOString() });
    showResult("⚠️ Bereits gescannt", `${ticket.name} · ID: ${ticket.id}`, "warning");
    updateStats();
    saveState();
    return;
  }

  ticket.scanned = true;
  ticket.scannedAt = new Date().toISOString();
  scannedCodes.add(normalized);
  scanLog.push({ id: ticket.id, code: ticket.code, name: ticket.name, status: "valid", scannedAt: ticket.scannedAt });
  showResult("✅ Gültig", `${ticket.name} · ID: ${ticket.id}`, "good");
  updateStats();
  saveState();
}

function showResult(title, text, type) {
  const box = document.getElementById("resultBox");
  document.getElementById("resultTitle").textContent = title;
  document.getElementById("resultText").textContent = text;
  box.className = `result ${type}`;
}

function updateCounter() {
  document.getElementById("ticketCounter").textContent = `Tickets geladen: ${tickets.length}`;
}

function updateStats() {
  document.getElementById("validCount").textContent = scanLog.filter(x => x.status === "valid").length;
  document.getElementById("duplicateCount").textContent = scanLog.filter(x => x.status === "duplicate").length;
  document.getElementById("invalidCount").textContent = scanLog.filter(x => x.status === "invalid").length;
}

function login() {
  if (passwordInput.value === PASSWORD) {
    loginScreen.classList.add("hidden");
    scannerScreen.classList.remove("hidden");
    loginError.textContent = "";
  } else {
    loginError.textContent = "Falsches Passwort.";
  }
}

async function startScanner() {
  if (!tickets.length) {
    showResult("Ticketliste fehlt", "Bitte zuerst Excel-Datei hochladen.", "warning");
    return;
  }

  try {
    if (!html5QrCode) html5QrCode = new Html5Qrcode("reader");
    await html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      decodedText => handleScan(decodedText),
      () => {}
    );
  } catch (err) {
    showResult("Kamera-Fehler", "Kamera konnte nicht gestartet werden. GitHub Pages muss über HTTPS geöffnet sein.", "bad");
    console.error(err);
  }
}

async function stopScanner() {
  if (!html5QrCode) return;
  try { await html5QrCode.stop(); } catch (e) { console.warn(e); }
}

function exportResults() {
  const exportData = { exportedAt: new Date().toISOString(), tickets, scanLog };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `scan-ergebnisse-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();

  if (ext === "json") {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data)) throw new Error("JSON muss ein Array sein.");
    tickets = data.map(item => typeof item === "string" ? { code: item, name: item, scanned: false, scannedAt: null } : {
      id: item.id || item.ticketid || item.code,
      code: item.id || item.ticketid || item.code,
      name: item.name || item.code || item.id || item.ticketid,
      scanned: Boolean(item.scanned),
      scannedAt: item.scannedAt || null
    }).filter(item => item.id || item.code);
  } else {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "", raw: false });
    tickets = rowsToTickets(rows);
  }

  scannedCodes = new Set(tickets.filter(t => t.scanned).map(t => normalizeId(t.id || t.code)));
  scanLog = [];
  updateCounter();
  updateStats();
  saveState();
  showResult("Liste geladen", `${tickets.length} Tickets bereit.`, "good");
}

fileInput.addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    await importFile(file);
  } catch (e) {
    console.error(e);
    showResult("Dateifehler", "Die Datei konnte nicht gelesen werden. Prüfe: Spalte A = Name, Spalte C = ID.", "bad");
  }
});

loginBtn.addEventListener("click", login);
passwordInput.addEventListener("keydown", e => { if (e.key === "Enter") login(); });
logoutBtn.addEventListener("click", () => {
  scannerScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  passwordInput.value = "";
  stopScanner();
});
startBtn.addEventListener("click", startScanner);
stopBtn.addEventListener("click", stopScanner);
exportBtn.addEventListener("click", exportResults);
manualBtn.addEventListener("click", () => handleScan(manualInput.value));
manualInput.addEventListener("keydown", e => { if (e.key === "Enter") handleScan(manualInput.value); });
resetBtn.addEventListener("click", () => {
  if (!confirm("Wirklich lokalen Scanstand löschen?")) return;
  localStorage.removeItem(STORAGE_KEY);
  tickets = tickets.map(t => ({ ...t, scanned: false, scannedAt: null }));
  scannedCodes = new Set();
  scanLog = [];
  updateStats();
  saveState();
  showResult("Zurückgesetzt", "Lokaler Scanstand wurde gelöscht.", "neutral");
});

loadState();
