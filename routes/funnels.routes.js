// routes/funnels.routes.js
const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const DB = path.join(__dirname, "..", "db.json");

function readDB(){ try{ return JSON.parse(fs.readFileSync(DB,"utf8")); }catch(e){ return {}; } }
function writeDB(data){ fs.writeFileSync(DB, JSON.stringify(data, null, 2)); }

// GET all funnels
router.get("/", (req,res) => {
  const db = readDB();
  res.json(db.funnels || []);
});

router.post("/", (req,res) => {
  const db = readDB(); if(!db.funnels) db.funnels = [];
  const id = Date.now();
  const newF = { id, name: req.body.name||"Novo Funil", description: req.body.description||"", steps: req.body.steps||[], nodes: req.body.nodes||[], integration: req.body.integration||null, version: 1 };
  db.funnels.push(newF);
  if(!db.versions) db.versions = {};
  db.versions[id] = db.versions[id] || [];
  db.versions[id].push({ id: Date.now(), date: new Date(), label: "v1", nodes: newF.nodes || [], edges: newF.edges || [], note: "Initial" });
  writeDB(db);
  res.json(newF);
});

module.exports = router;
