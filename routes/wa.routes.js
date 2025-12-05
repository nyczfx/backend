// routes/wa.routes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const session = require("../services/session");
const messageBot = require("../bots/messageBot");
const audioBot = require("../bots/audioBot");

const uploadFolder = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder);

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadFolder),
  filename: (_, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });

// GET QR
router.get("/qr", (req, res) => {
  const qr = session.getQRCodeDataURL();
  if (!qr) return res.json({ ok: false, msg: "QR not available" });
  res.json({ ok: true, qr });
});

// GET STATUS
router.get("/status", (req, res) => {
  res.json({ ok: true, status: session.getStatus() });
});

// CLEAR SESSION
router.post("/clear-session", (req, res) => {
  session.clearSession();
  res.json({ ok: true });
});

// SEND TEXT
router.post("/send-text", async (req, res) => {
  try {
    const { number, text } = req.body;
    if (!number || !text) return res.status(400).json({ ok: false, error: "Missing number or text" });
    await messageBot.sendText(number, text);
    // log minimal
    const DB = path.join(__dirname, "..", "db.json");
    const db = JSON.parse(fs.readFileSync(DB, "utf8"));
    db.messages = db.messages || [];
    db.messages.push({ id: Date.now(), number, text, date: new Date() });
    fs.writeFileSync(DB, JSON.stringify(db, null, 2));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// SEND AUDIO (upload)
router.post("/send-audio", upload.single("audio"), async (req, res) => {
  try {
    const { number } = req.body;
    if (!number) return res.status(400).json({ ok: false, error: "Missing number" });
    if (!req.file) return res.status(400).json({ ok: false, error: "Missing file" });
    const filePath = req.file.path;
    await audioBot.sendAudioFile(number, filePath);
    // log
    const DB = path.join(__dirname, "..", "db.json");
    const db = JSON.parse(fs.readFileSync(DB, "utf8"));
    db.audios = db.audios || [];
    db.audios.push({ id: Date.now(), number, audio: filePath, date: new Date() });
    fs.writeFileSync(DB, JSON.stringify(db, null, 2));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
