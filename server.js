require("dotenv").config();
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "painel.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    type TEXT NOT NULL,
    query TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
const adminUser = process.env.ADMIN_USER || "admin";
const adminPass = process.env.ADMIN_PASSWORD || "troque-esta-senha";
if (!db.prepare("SELECT id FROM users WHERE username = ?").get(adminUser)) {
  const hash = bcrypt.hashSync(adminPass, 12);
  db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").run(adminUser, hash);
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "20kb" }));
app.use(session({
  name: "cj.sid",
  secret: process.env.SESSION_SECRET || "development-only-change-this-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 8
  }
}));
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false });

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Faça login para continuar." });
  next();
}
function logSearch(user, type, query) {
  db.prepare("INSERT INTO history (username, type, query) VALUES (?, ?, ?)").run(user, type, query);
}

app.post("/api/login", loginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== "string" || typeof password !== "string" ||
      username.length > 50 || password.length > 200) {
    return res.status(400).json({ error: "Preencha usuário e senha." });
  }
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username.trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Usuário ou senha incorretos." });
  }
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: "Não foi possível iniciar a sessão." });
    req.session.user = user.username;
    res.json({ username: user.username });
  });
});
app.post("/api/logout", requireAuth, (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});
app.get("/api/me", (req, res) => {
  res.json({ authenticated: !!req.session.user, username: req.session.user || null });
});

app.get("/api/history", requireAuth, (req, res) => {
  const rows = db.prepare(
    "SELECT type, query, created_at FROM history WHERE username = ? ORDER BY id DESC LIMIT 30"
  ).all(req.session.user);
  res.json(rows);
});

app.get("/api/cep/:cep", requireAuth, async (req, res) => {
  const cep = String(req.params.cep).replace(/\D/g, "");
  if (!/^\d{8}$/.test(cep)) return res.status(400).json({ error: "Digite um CEP com 8 números." });
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) throw new Error("Serviço indisponível");
    const data = await response.json();
    if (data.erro) return res.status(404).json({ error: "CEP não encontrado." });
    logSearch(req.session.user, "CEP", cep);
    res.json(data);
  } catch {
    res.status(502).json({ error: "Não foi possível consultar o serviço de CEP agora." });
  }
});

app.get("/api/cnpj/:cnpj", requireAuth, async (req, res) => {
  const cnpj = String(req.params.cnpj).replace(/\D/g, "");
  if (!/^\d{14}$/.test(cnpj)) return res.status(400).json({ error: "Digite um CNPJ com 14 números." });
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    if (response.status === 404) return res.status(404).json({ error: "CNPJ não encontrado." });
    if (!response.ok) throw new Error("Serviço indisponível");
    const data = await response.json();
    logSearch(req.session.user, "CNPJ", cnpj);
    res.json(data);
  } catch {
    res.status(502).json({ error: "Não foi possível consultar o serviço de CNPJ agora." });
  }
});

app.use(express.static(path.join(__dirname, "public")));
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`Conexão Judaica disponível em http://localhost:${PORT}`));
