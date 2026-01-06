const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers
} = require("@whiskeysockets/baileys");

const qrcode = require("qrcode");

let sock = null;
let qrCodeDataURL = null;
let status = "disconnected";

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");

  // 🔥 FIX: VERSÃO ESTÁVEL DO WHATSAPP WEB
  const version = [2, 3000, 1045518320];

  sock = makeWASocket({
    auth: state,
    browser: Browsers.macOS("Safari"),
    printQRInTerminal: false,
    version,
    markOnlineOnConnect: false,
    syncFullHistory: false
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    console.log("📡 UPDATE:", update);

    const { connection, lastDisconnect } = update;

    // --------------------------
    // 🔥 QR RECEBIDO
    // --------------------------
    if (update.qr) {
      try {
        console.log("⚡ QR RECEBIDO → convertendo...");
        const qrString = update.qr.toString().trim();

        qrCodeDataURL = await qrcode.toDataURL(qrString, {
          errorCorrectionLevel: "H",
          margin: 2
        });

        status = "qr";
        console.log("📲 QR DISPONÍVEL PARA O FRONTEND!");

      } catch (err) {
        console.log("❌ ERRO AO CONVERTER QR:", err);
      }
    }

    // --------------------------
    // 🔓 CONECTADO
    // --------------------------
    if (connection === "open") {
      console.log("🔥 BOT CONECTADO AO WHATSAPP!");
      status = "connected";
      qrCodeDataURL = null;
    }

    // --------------------------
    // ❌ DESCONECTADO
    // --------------------------
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      status = "disconnected";
      qrCodeDataURL = null;

      console.log("❌ Conexão perdida:", lastDisconnect?.error);

      if (shouldReconnect) {
        console.log("🔁 Tentando reconectar...");
        await startBot();
      } else {
        console.log("🛑 Logout detectado. Sessão encerrada.");
      }
    }
  });
}

// --------------------------
// FUNÇÕES DE ENVIO
// --------------------------
function getQRCodeDataURL() {
  return qrCodeDataURL;
}

function getStatus() {
  return status;
}

async function sendText(number, text) {
  const jid = number.replace(/\D/g, "") + "@s.whatsapp.net";
  return await sock.sendMessage(jid, { text });
}

async function sendImage(number, fileUrl, caption = "") {
  const jid = number.replace(/\D/g, "") + "@s.whatsapp.net";
  return await sock.sendMessage(jid, {
    image: { url: fileUrl }, // ✅ suporta URL externa
    caption
  });
}

// 🔥 Ajustado para URL externa
async function sendAudioFile(number, fileUrl) {
  const jid = number.replace(/\D/g, "") + "@s.whatsapp.net";

  console.log("▶ Enviando áudio para:", number, "->", fileUrl);

  return await sock.sendMessage(jid, {
    audio: { url: fileUrl },   // ✅ usa URL externa em vez de path local
    mimetype: "audio/ogg",     // ✅ formato compatível com WhatsApp
    ptt: true                  // ✅ mantém PTT
  });
}

function clearSession() {
  const fs = require("fs");
  fs.rmSync("./auth", { recursive: true, force: true });
  console.log("❌ Sessão apagada.");
}

module.exports = {
  startBot,
  getQRCodeDataURL,
  getStatus,
  sendText,
  sendImage,
  sendAudioFile,
  clearSession,
  get sock() {
    return sock;
  }
};
