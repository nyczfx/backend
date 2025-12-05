// services/session.js
const {
  default: makeWASocket,
  useMultiFileAuthState,
  Browsers,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const qrcode = require("qrcode");
const fs = require("fs");
const path = require("path");

let sock = null;
let qrDataUrl = null;
let status = "disconnected";

async function startSession(authFolder = "./baileys_auth") {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      printQRInTerminal: false,
      auth: state,
      browser: Browsers.macOS("Desktop"),
      version
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // converte QR para dataURL
        try {
          qrDataUrl = await qrcode.toDataURL(qr);
        } catch (e) {
          qrDataUrl = null;
        }
        status = "qr";
      }

      if (connection === "open") {
        status = "connected";
        qrDataUrl = null;
        console.log("✅ Baileys connected");
      }

      if (connection === "close") {
        status = "disconnected";
        qrDataUrl = null;

        const shouldReconnect =
          !(lastDisconnect?.error?.output?.statusCode === 401);

        if (shouldReconnect) {
          status = "reconnecting";
          console.log("🔁 Tentando reconectar...");
          // espera um pouco antes de tentar
          setTimeout(() => startSession(authFolder).catch(e => console.error("reconnect failed", e.message)), 3000);
        } else {
          console.log("🔒 Sessão deslogada (401) — clear credentials to reset");
        }
      }
    });

    status = "starting";
    return sock;
  } catch (err) {
    console.error("startSession error:", err);
    status = "error";
    throw err;
  }
}

function getQRCodeDataURL() {
  return qrDataUrl;
}

function getStatus() {
  return status;
}

function getSock() {
  return sock;
}

function clearSession(authFolder = "./baileys_auth") {
  const folder = path.resolve(authFolder);
  if (fs.existsSync(folder)) {
    fs.rmSync(folder, { recursive: true, force: true });
  }
  qrDataUrl = null;
  status = "disconnected";
}

module.exports = {
  startSession,
  getQRCodeDataURL,
  getStatus,
  getSock,
  clearSession
};
