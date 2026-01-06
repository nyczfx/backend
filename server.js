// ----------------------------
// IMPORTS
// ----------------------------
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const multer = require("multer");

// ----------------------------
// POLYFILL CRYPTO PARA BAILEYS
// ----------------------------
const crypto = require("crypto");
globalThis.crypto = crypto.webcrypto || crypto;

// ----------------------------
// BOT
// ----------------------------
const bot = require("./bot");

// ----------------------------
// CONFIG INICIAL
// ----------------------------
const app = express();
app.use(cors({ origin: "http://localhost:3000", methods: ["GET", "POST", "DELETE"] }));
app.use(express.json());

// Uploads
const upload = multer({ dest: "uploads/" });

// ----------------------------
// DATABASE (JSON)
// ----------------------------
const DB = path.join(__dirname, "db.json");

function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB, "utf8"));
  } catch {
    return {
      contacts: [],
      leads: [],
      messages: [],
      audios: []
    };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

// ----------------------------
// INICIAR BOT AUTOMATICAMENTE
// ----------------------------
(async () => {
  await bot.startBot();
  console.log("🤖 BOT inicializado.");
})();

// ----------------------------
// ROTAS DE CONTATOS
// ----------------------------
app.get("/contacts", (req, res) => {
  const db = readDB();
  res.json(db.contacts || []);
});

app.post("/contacts", (req, res) => {
  const db = readDB();

  const contato = {
    id: Date.now(),
    name: req.body.name,
    number: req.body.number,
    tag: req.body.tag || "",
    notes: req.body.notes || "",
  };

  db.contacts.push(contato);
  writeDB(db);

  res.json({ ok: true, contato });
});

app.delete("/contacts", (req, res) => {
  const { number } = req.body;
  if (!number) return res.json({ ok: false });

  const db = readDB();
  db.contacts = db.contacts.filter(c => c.number !== number);
  writeDB(db);

  res.json({ ok: true });
});

// ----------------------------
// LEADS
// ----------------------------
app.get("/leads", (req, res) => {
  const db = readDB();
  res.json(db.leads || []);
});

// ----------------------------
// WHATSAPP STATUS / QR
// ----------------------------
app.get("/wa/qr", (req, res) => {
  const qr = bot.getQRCodeDataURL();
  if (!qr) return res.json({ ok: false });
  res.json({ ok: true, qr });
});

app.get("/wa/status", (req, res) => {
  res.json({ ok: true, status: bot.getStatus() });
});

// ----------------------------
// ENVIAR TEXTO / IMAGEM
// ----------------------------
app.post("/wa/send-message", upload.single("image"), async (req, res) => {
  try {
    const { number, message } = req.body;
    if (!number || !message) return res.json({ ok: false });

    if (req.file) {
      await bot.sendImage(number, req.file.path, message);
    } else {
      await bot.sendText(number, message);
    }

    // 🔥 REGISTRAR MESSAGE NO DB
    const db = readDB();
    db.messages = db.messages || [];
    db.messages.push({
      id: Date.now(),
      number,
      date: new Date().toISOString(),
    });
    writeDB(db);

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Erro enviar mensagem:", err);
    res.json({ ok: false, error: err.message });
  }
});

// ----------------------------
// ENVIAR ÁUDIO
// ----------------------------
app.post("/wa/send-audio", upload.single("audio"), async (req, res) => {
  try {
    const { number } = req.body;
    if (!number || !req.file) return res.json({ ok: false });

    await bot.sendAudioFile(number, req.file.path);

    // 🔥 REGISTRAR AUDIO NO DB
    const db = readDB();
    db.audios = db.audios || [];
    db.audios.push({
      id: Date.now(),
      number,
      audio: req.file.path,
      date: new Date().toISOString(),
    });
    writeDB(db);

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Erro enviar áudio:", err);
    res.json({ ok: false, error: err.message });
  }
});

// ----------------------------
// LIMPAR SESSÃO
// ----------------------------
app.post("/wa/clear-session", (req, res) => {
  bot.clearSession();
  res.json({ ok: true });
});

// ----------------------------
// START SERVER
// ----------------------------
const PORT = 3001;
app.listen(PORT, () => console.log(`🔥 Backend rodando na porta ${PORT}`));
