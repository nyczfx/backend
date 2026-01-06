// routes/contacts.routes.js
const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const DB = path.join(__dirname, "..", "db.json");

function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB,"utf8"));
  } catch (e) {
    return {};
  }
}
function writeDB(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

// GET contatos
router.get("/", (req, res) => {
  const db = readDB();
  res.json(db.contatos || []);
});

// POST contato
router.post("/", (req, res) => {
  const { name, number, tag, notes } = req.body;

  if (!name || !number) return res.json({ ok: false });

  const db = readDB();
  db.contatos = db.contatos || [];

  const novo = {
    id: Date.now(),
    name,
    number,
    tag: tag || "",
    notes: notes || ""
  };

  db.contatos.push(novo);
  writeDB(db);

  res.json({ ok: true, contato: novo });
});

// DELETE contato
router.delete("/:id", (req, res) => {
  const db = readDB();
  db.contatos = (db.contatos||[]).filter(c => c.id != req.params.id);
  writeDB(db);
  res.json({ ok: true });
});

module.exports = router;
