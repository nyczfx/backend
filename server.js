const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const multer = require("multer");

const bot = require("./bot");

// ----------------------------
// CONFIG INICIAL
// ----------------------------
const app = express();
app.use(cors());
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
    return { contacts: [] };
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
    tag: req.body.tag,
    notes: req.body.notes
  };

  db.contacts.push(contato);
  writeDB(db);

  res.json({ ok: true, contato });
});

// ----------------------------
// QR CODE
// ----------------------------
app.get("/wa/qr", (req, res) => {
  const qr = bot.getQRCodeDataURL();
  if (!qr) return res.json({ ok: false, msg: "QR Code não disponível" });
  res.json({ ok: true, qr });
});

// ----------------------------
// STATUS
// ----------------------------
app.get("/wa/status", (req, res) => {
  res.json({ ok: true, status: bot.getStatus() });
});

// ----------------------------
// ENVIAR TEXTO + IMAGEM
// ----------------------------
app.post("/wa/send-message", upload.single("image"), async (req, res) => {
  try {
    const { number, message } = req.body;

    if (!number || !message)
      return res.json({ ok: false, error: "Dados insuficientes" });

    if (req.file) {
      await bot.sendImage(number, req.file.path, message);
    } else {
      await bot.sendText(number, message);
    }

    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// ----------------------------
// ENVIAR ÁUDIO
// ----------------------------
app.post("/wa/send-audio", upload.single("audio"), async (req, res) => {
  try {
    const { number } = req.body;

    if (!number || !req.file)
      return res.json({ ok: false, error: "Dados insuficientes" });

    await bot.sendAudioFile(number, req.file.path);

    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: e.message });
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
