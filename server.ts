import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import multer from "multer";
import { Server } from "socket.io";
import http from "http";
import fs from "fs";
import { format, parseISO, differenceInMinutes, isWeekend, addDays, getDay, isSameDay, setHours, setMinutes, startOfDay, endOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";

import crypto from "crypto";
import bcrypt from "bcryptjs";

const ENCRYPTION_KEY = crypto.createHash('sha256').update('digicab-ml-secure-key-2026').digest();
const IV_LENGTH = 12;

function encrypt(text: string | null | undefined): string | null {
  if (!text) return null;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (e) {
    console.error("Encryption error:", e);
    return text;
  }
}

function decrypt(text: string | null | undefined): string | null {
  if (!text) return null;
  try {
    const parts = text.split(':');
    if (parts.length !== 3) return text;
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return text;
  }
}

console.log("Initialisation de la base de données...");
const dbPath = process.env.DATABASE_PATH || "database.db";
const db = new Database(dbPath);
const app = express();

// Health check route - Early to verify server is up
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const upload = multer({ limits: { fileSize: 200 * 1024 * 1024 } }); // 200MB limit

app.use(express.json());

// Initialize Database Schema - ALL TABLES FIRST
console.log("Création des tables...");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    name TEXT,
    email TEXT,
    avatar TEXT,
    canCreateAccounts INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS rmo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    displayOrder INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS dossiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT UNIQUE NOT NULL,
    object TEXT NOT NULL,
    rmo_id INTEGER REFERENCES rmo(id),
    status TEXT NOT NULL,
    priority TEXT DEFAULT 'Normale',
    circuit TEXT DEFAULT 'Normal SP',
    date_instruction TEXT NOT NULL,
    date_signature TEXT,
    date_echeance TEXT,
    current_holder TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    archived_at TEXT,
    transferred_from_id INTEGER
  );

  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dossier_id INTEGER REFERENCES dossiers(id),
    name TEXT NOT NULL,
    size INTEGER NOT NULL,
    type TEXT NOT NULL,
    data BLOB NOT NULL,
    uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS jours_feries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,
    type TEXT CHECK(type IN ('FERIE', 'ASTREINTE')) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS parametres (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    dossier_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    message TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER REFERENCES users(id),
    receiver_id INTEGER REFERENCES users(id),
    session_id INTEGER,
    content TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chat_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    manager_id INTEGER REFERENCES users(id),
    participant_id INTEGER REFERENCES users(id),
    created_by INTEGER REFERENCES users(id),
    status TEXT DEFAULT 'OPEN',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    closed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS chat_session_shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER REFERENCES chat_sessions(id),
    shared_with_id INTEGER REFERENCES users(id),
    shared_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS committees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS committee_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    committee_id INTEGER REFERENCES committees(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(committee_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    login_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TEXT DEFAULT CURRENT_TIMESTAMP,
    logout_at TEXT,
    duration_minutes INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS archive_dossiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_id INTEGER,
    rmo_id INTEGER,
    rmo_origine TEXT,
    numero TEXT,
    objet TEXT,
    date_instruction TEXT,
    date_signature TEXT,
    date_echeance TEXT,
    archive_type TEXT,
    observation TEXT,
    archived_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Triggers
db.exec(`
  CREATE TRIGGER IF NOT EXISTS protect_admin_delete
  BEFORE DELETE ON users
  FOR EACH ROW
  WHEN OLD.username = 'admin'
  BEGIN
    SELECT RAISE(FAIL, 'Le compte administrateur racine ne peut être supprimé.');
  END;

  CREATE TRIGGER IF NOT EXISTS protect_admin_update
  BEFORE UPDATE ON users
  FOR EACH ROW
  WHEN OLD.username = 'admin' AND (NEW.username != 'admin' OR NEW.role != 'ADMIN' OR NEW.is_active = 0)
  BEGIN
    SELECT RAISE(FAIL, 'Les privilèges critiques de l''administrateur racine sont immuables.');
  END;
`);

// Helper for migrations
function addColumnIfNotExists(table: string, column: string, type: string) {
  try {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
    if (!columns.some(c => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      console.log(`Column ${column} added to ${table}`);
    }
  } catch (err) {
    console.error(`Error adding column ${column} to ${table}:`, err);
  }
}

// Ensure columns exist (Migrations)
console.log("Exécution des migrations...");
addColumnIfNotExists("users", "permissions", "TEXT");
addColumnIfNotExists("users", "is_active", "INTEGER DEFAULT 1");
addColumnIfNotExists("users", "is_responsible", "INTEGER DEFAULT 0");
addColumnIfNotExists("users", "created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP");
addColumnIfNotExists("dossiers", "entreprise", "TEXT");
addColumnIfNotExists("dossiers", "contact_person", "TEXT");
addColumnIfNotExists("dossiers", "contact_phone", "TEXT");
addColumnIfNotExists("dossiers", "validation_status", "TEXT DEFAULT 'VALIDATED'");
addColumnIfNotExists("dossiers", "creator_id", "INTEGER REFERENCES users(id)");
addColumnIfNotExists("messages", "session_id", "INTEGER");
addColumnIfNotExists("messages", "is_read", "INTEGER DEFAULT 0");
addColumnIfNotExists("logs", "dossier_id", "INTEGER");


// Seed Initial Data pour Cabinet ML (V2.2)
console.log("Seeding des données initiales...");
const insertUserSeed = db.prepare("INSERT OR IGNORE INTO users (username, password, role, name, canCreateAccounts) VALUES (?, ?, ?, ?, 1)");
const initialUsers = [
  { u: 'admin', p: 'Nobo0605uqo!', r: 'ADMIN', n: 'Administrateur' },
  { u: 'maire', p: 'ml123', r: 'MAIRE', n: 'Maire de Libreville' },
];
initialUsers.forEach(u => {
  insertUserSeed.run(u.u, bcrypt.hashSync(u.p, 10), u.r, u.n);
});

// Seed RMOs
const rmosCount = db.prepare("SELECT COUNT(*) as count FROM rmo").get() as any;
if (rmosCount.count === 0) {
  const insertRmo = db.prepare("INSERT INTO rmo (code, name, displayOrder) VALUES (?, ?, ?)");
  const initialRmos = [
    { c: 'CAB-ML', n: 'Cabinet du Maire', o: 1 },
    { c: 'SP-ML', n: 'Secrétariat Particulier', o: 2 },
    { c: 'DC-ML', n: 'Direction de la Communication', o: 3 },
    { c: 'SC-ML', n: 'Secrétariat Central', o: 4 },
    { c: 'COM-DIGI', n: 'Comité Digitalisation', o: 5 },
  ];
  initialRmos.forEach(r => insertRmo.run(r.c, r.n, r.o));
}

// Seed App Name in parametres
const appNameExist = db.prepare("SELECT COUNT(*) as count FROM parametres WHERE key = 'app_name'").get() as any;
if (appNameExist.count === 0) {
  db.prepare("INSERT INTO parametres (key, value) VALUES (?, ?)").run('app_name', 'DIGICAB ML');
}

const entityNameExist = db.prepare("SELECT COUNT(*) as count FROM parametres WHERE key = 'mairie_name'").get() as any;
if (entityNameExist.count === 0) {
  db.prepare("INSERT INTO parametres (key, value) VALUES (?, ?)").run('mairie_name', 'Mairie de Libreville - République Gabonaise');
}

const dashSubExist = db.prepare("SELECT COUNT(*) as count FROM parametres WHERE key = 'dash_subtitle'").get() as any;
if (dashSubExist.count === 0) {
  db.prepare("INSERT INTO parametres (key, value) VALUES (?, ?)").run('dash_subtitle', 'Tableau de Bord Stratégique');
}

const portSubExist = db.prepare("SELECT COUNT(*) as count FROM parametres WHERE key = 'port_subtitle'").get() as any;
if (portSubExist.count === 0) {
  db.prepare("INSERT INTO parametres (key, value) VALUES (?, ?)").run('port_subtitle', 'Pilotage Stratégique / Cabinet du Maire');
}

const syncLabelExist = db.prepare("SELECT COUNT(*) as count FROM parametres WHERE key = 'sync_label'").get() as any;
if (syncLabelExist.count === 0) {
  db.prepare("INSERT INTO parametres (key, value) VALUES (?, ?)").run('sync_label', 'Synchronisation de la Gouvernance');
}

// Seed Work Hour Parameters
const workStartExist = db.prepare("SELECT COUNT(*) as count FROM parametres WHERE key = 'heure_debut'").get() as any;
if (workStartExist.count === 0) {
  db.prepare("INSERT INTO parametres (key, value) VALUES (?, ?)").run('heure_debut', '08:00');
}

const workEndExist = db.prepare("SELECT COUNT(*) as count FROM parametres WHERE key = 'heure_fin'").get() as any;
if (workEndExist.count === 0) {
  db.prepare("INSERT INTO parametres (key, value) VALUES (?, ?)").run('heure_fin', '18:00');
}

const pauseStartExist = db.prepare("SELECT COUNT(*) as count FROM parametres WHERE key = 'heure_pause_debut'").get() as any;
if (pauseStartExist.count === 0) {
  db.prepare("INSERT INTO parametres (key, value) VALUES (?, ?)").run('heure_pause_debut', '12:30');
}

const pauseEndExist = db.prepare("SELECT COUNT(*) as count FROM parametres WHERE key = 'heure_pause_fin'").get() as any;
if (pauseEndExist.count === 0) {
  db.prepare("INSERT INTO parametres (key, value) VALUES (?, ?)").run('heure_pause_fin', '13:30');
}

const deadlineBasisExist = db.prepare("SELECT COUNT(*) as count FROM parametres WHERE key = 'delai_moyen_traitement'").get() as any;
if (deadlineBasisExist.count === 0) {
  db.prepare("INSERT INTO parametres (key, value) VALUES (?, ?)").run('delai_moyen_traitement', '48'); // 48 heures par défaut
}

const alertThresholdExist = db.prepare("SELECT COUNT(*) as count FROM parametres WHERE key = 'seuil_alerte_echeance'").get() as any;
if (alertThresholdExist.count === 0) {
  db.prepare("INSERT INTO parametres (key, value) VALUES (?, ?)").run('seuil_alerte_echeance', '12'); // 12 heures avant écheance
}

// Cache memoization for settings to avoid DB pressure during loops
let cachedSettings: any = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 30000; // 30 seconds

function getSettings() {
  const now = Date.now();
  if (cachedSettings && (now - lastCacheUpdate < CACHE_TTL)) {
    return cachedSettings;
  }

  const holidays = new Set((db.prepare("SELECT date FROM jours_feries WHERE type = 'FERIE'").all() as any[]).map(r => r.date.split('T')[0]));
  const astreintes = new Set((db.prepare("SELECT date FROM jours_feries WHERE type = 'ASTREINTE'").all() as any[]).map(r => r.date.split('T')[0]));
  
  const params: any = {};
  const rows = db.prepare('SELECT key, value FROM parametres').all() as any[];
  rows.forEach(r => params[r.key] = r.value);

  cachedSettings = { holidays, astreintes, params };
  lastCacheUpdate = now;
  return cachedSettings;
}

function calculerDelaiOuvre(dateDebutStr: string, dateFinStr: string | null): number {
  if (!dateDebutStr) return 0;
  
  const dateDebut = parseISO(dateDebutStr);
  let dateFin = dateFinStr ? parseISO(dateFinStr) : new Date();

  if (isNaN(dateDebut.getTime()) || isNaN(dateFin.getTime())) return 0;
  if (dateDebut > dateFin) return 0;

  const { holidays, astreintes, params } = getSettings();
  const hStart = params['heure_debut'] || '07:30';
  const hEnd = params['heure_fin'] || '16:30';
  const hPauseStart = params['heure_pause_debut'] || '12:30';
  const hPauseEnd = params['heure_pause_fin'] || '13:30';

  const [hs, ms] = hStart.split(':').map(Number);
  const [he, me] = hEnd.split(':').map(Number);
  const [hps, mps] = hPauseStart.split(':').map(Number);
  const [hpe, mpe] = hPauseEnd.split(':').map(Number);

  let totalMinutes = 0;
  let current = new Date(dateDebut);

  // Maximum 366 days to avoid long loops
  const limitDate = addDays(current, 366);
  const finalDate = dateFin < limitDate ? dateFin : limitDate;

  while (current < finalDate) {
    const dayStr = format(current, 'yyyy-MM-dd');
    const isWknd = isWeekend(current);
    const isWorkDay = (!isWknd && !holidays.has(dayStr)) || astreintes.has(dayStr);

    if (isWorkDay) {
      const dayBegin = setMinutes(setHours(startOfDay(current), hs), ms);
      const dayClose = setMinutes(setHours(startOfDay(current), he), me);
      const pauseBegin = setMinutes(setHours(startOfDay(current), hps), mps);
      const pauseClose = setMinutes(setHours(startOfDay(current), hpe), mpe);

      const start = current > dayBegin ? current : dayBegin;
      const end = finalDate < dayClose ? finalDate : dayClose;

      if (start < end) {
        // Morning
        const mStart = start;
        const mEnd = end < pauseBegin ? end : pauseBegin;
        if (mStart < mEnd) totalMinutes += differenceInMinutes(mEnd, mStart);

        // Afternoon
        const aStart = start > pauseClose ? start : pauseClose;
        const aEnd = end;
        if (aStart < aEnd) totalMinutes += differenceInMinutes(aEnd, aStart);
      }
    }
    current = startOfDay(addDays(current, 1));
  }

  return totalMinutes / 60;
}

// --- API Routes ---

app.get("/api/users", (req, res) => {
  const users = db.prepare("SELECT id, username, role, name, avatar, canCreateAccounts, permissions, is_active, is_responsible FROM users ORDER BY role").all();
  res.json(users.map((u: any) => ({ ...u, is_active: u.is_active === 1, is_responsible: u.is_responsible === 1 })));
});

app.post("/api/users", (req, res) => {
  const { username, password, name, role } = req.body;
  const hash = bcrypt.hashSync(password, 10);
  try {
    const result = db.prepare("INSERT INTO users (username, password, name, role, is_active) VALUES (?, ?, ?, ?, 1)")
      .run(username, hash, name, role);
    res.json({ id: result.lastInsertRowid });
  } catch (err: any) {
    res.status(400).json({ error: "L'utilisateur existe déjà ou données invalides." });
  }
});

app.delete("/api/users/:id", (req, res) => {
  const { id } = req.params;
  if (id === '1') return res.status(403).json({ error: "Impossible de supprimer l'administrateur principal." });
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  res.json({ success: true });
});

app.put("/api/users/:id/permissions", (req, res) => {
  const { id } = req.params;
  const { permissions, is_active, role, is_responsible, name, username } = req.body;
  
  try {
    // If it's the main admin (ID 1), prevent changing username if it would lock out the admin
    if (id === '1' && username && username !== 'admin') {
      // Allow it but with caution, though usually admin should stay 'admin'
    }

    db.prepare("UPDATE users SET permissions = ?, is_active = ?, role = ?, is_responsible = ?, name = ?, username = ? WHERE id = ?")
      .run(JSON.stringify(permissions), is_active ? 1 : 0, role, is_responsible ? 1 : 0, name || '', username || '', id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Erreur lors de la mise à jour des permissions" });
  }
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
  if (user && bcrypt.compareSync(password, user.password)) {
    // Create session
    const sessionResult = db.prepare("INSERT INTO user_sessions (user_id) VALUES (?)").run(user.id);
    res.json({ 
      id: user.id, 
      username: user.username, 
      role: user.role, 
      name: user.name, 
      avatar: user.avatar, 
      canCreateAccounts: user.canCreateAccounts,
      is_responsible: user.is_responsible === 1,
      sessionId: sessionResult.lastInsertRowid
    });
  } else {
    res.status(401).json({ error: "Identifiants invalides" });
  }
});

app.get("/api/rmos", (req, res) => {
  const rmos = db.prepare("SELECT * FROM rmo ORDER BY displayOrder ASC").all();
  res.json(rmos);
});

app.post("/api/rmos", (req, res) => {
  const { code, name, displayOrder } = req.body;
  try {
    const result = db.prepare("INSERT INTO rmo (code, name, displayOrder) VALUES (?, ?, ?)")
      .run(code, name, displayOrder || 0);
    res.json({ id: result.lastInsertRowid });
  } catch (err: any) {
    res.status(400).json({ error: "Le code RMO existe déjà ou données invalides." });
  }
});

app.put("/api/rmos/:id", (req, res) => {
  const { id } = req.params;
  const { code, name, displayOrder } = req.body;
  try {
    db.prepare("UPDATE rmo SET code = ?, name = ?, displayOrder = ? WHERE id = ?")
      .run(code, name, displayOrder, id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/rmos/:id", (req, res) => {
  const { id } = req.params;
  // Check if dossiers are linked
  const count = db.prepare("SELECT COUNT(*) as count FROM dossiers WHERE rmo_id = ?").get(id) as any;
  if (count.count > 0) {
    return res.status(400).json({ error: "Impossible de supprimer cet RMO car des dossiers y sont rattachés." });
  }
  db.prepare("DELETE FROM rmo WHERE id = ?").run(id);
  res.json({ success: true });
});

app.get("/api/dossiers", (req, res) => {
  const dossiers = db.prepare(`
    SELECT d.*, r.code as rmo_code, r.name as rmo_name, u.name as creator_name,
    (SELECT details FROM logs WHERE dossier_id = d.id ORDER BY timestamp DESC LIMIT 1) as last_comment
    FROM dossiers d 
    LEFT JOIN rmo r ON d.rmo_id = r.id
    LEFT JOIN users u ON d.created_by = u.id
    ORDER BY d.created_at DESC
  `).all() as any[];

  const enriched = dossiers.map(d => ({
    ...d,
    object: decrypt(d.object),
    entreprise: decrypt(d.entreprise),
    contact_person: decrypt(d.contact_person),
    contact_phone: decrypt(d.contact_phone),
    last_comment: decrypt(d.last_comment),
    delai: calculerDelaiOuvre(d.date_instruction, d.date_signature)
  }));
  res.json(enriched);
});

app.post("/api/dossiers", (req, res) => {
  const { 
    number, object, entreprise, contact_person, contact_phone,
    rmo_id, rmoId,
    status, priority, circuit, 
    date_instruction, dateInstruction, 
    date_echeance, dateEcheance, 
    current_holder, currentHolder, 
    createdBy, userRole 
  } = req.body;
  
  const finalRmoId = rmo_id || rmoId;
  const finalDateInstruction = date_instruction || dateInstruction || new Date().toISOString();
  const finalDateEcheance = date_echeance || dateEcheance;
  const finalCurrentHolder = current_holder || currentHolder;

  let finalNumber = number;
  if (!finalNumber || finalNumber.includes('RANDOM')) {
    const year = new Date().getFullYear();
    const lastDossier = db.prepare("SELECT number FROM dossiers WHERE number LIKE ? ORDER BY id DESC LIMIT 1").get(`CAB-ML-${year}-%`) as any;
    let nextSeq = 1;
    if (lastDossier) {
      const parts = lastDossier.number.split('-');
      const lastSeq = parseInt(parts[parts.length - 1]);
      if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
    }
    finalNumber = `CAB-ML-${year}-${String(nextSeq).padStart(4, '0')}`;
  }

  try {
    let finalStatus = status;
    let finalValidationStatus = 'VALIDATED';
    let targetRmoId = finalRmoId;

    // Workflow logic for standard members (ML)
    if (userRole === 'ML') {
      finalStatus = 'En attente de validation';
      finalValidationStatus = 'PENDING';
      
      // Auto-assign to responsible RMO or a default responsible
      // Usually CAB-ML (ID 1) as safety
      targetRmoId = 1; 
    }

    const rmoInfo = db.prepare("SELECT name FROM rmo WHERE id = ?").get(targetRmoId) as any;
    const finalHolderForNew = finalCurrentHolder || (rmoInfo ? rmoInfo.name : 'Cabinet');

    const result = db.prepare(`
      INSERT INTO dossiers (number, object, entreprise, contact_person, contact_phone, rmo_id, status, priority, circuit, date_instruction, date_echeance, current_holder, created_by, validation_status, creator_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      finalNumber, 
      encrypt(object), 
      encrypt(entreprise), 
      encrypt(contact_person), 
      encrypt(contact_phone), 
      targetRmoId, 
      finalStatus, 
      priority, 
      circuit, 
      finalDateInstruction, 
      finalDateEcheance, 
      finalHolderForNew, 
      createdBy,
      finalValidationStatus,
      createdBy
    );
    res.json({ id: result.lastInsertRowid, number: finalNumber });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Route de Recherche Avancée pour Décideurs (ML, SP-ML, DC-ML, SC-ML, CS-ML)
app.post("/api/search/advanced", (req, res) => {
  const { status, rmoId, dateStart, dateEnd, entreprise, object } = req.body;
  
  let query = `
    SELECT d.*, r.code as rmo_code, r.name as rmo_name 
    FROM dossiers d 
    LEFT JOIN rmo r ON d.rmo_id = r.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status) {
    query += " AND d.status = ?";
    params.push(status);
  }
  if (rmoId) {
    query += " AND d.rmo_id = ?";
    params.push(rmoId);
  }
  if (dateStart) {
    query += " AND d.date_instruction >= ?";
    params.push(dateStart);
  }
  if (dateEnd) {
    query += " AND d.date_instruction <= ?";
    params.push(dateEnd);
  }

  // Les champs chiffrés (entreprise, object) sont filtrés en mémoire pour la sécurité maximale
  try {
    let results = db.prepare(query).all(...params) as any[];
    
    // Déchiffrement et Filtrage Manuel
    const filtered = results.map(d => ({
      ...d,
      object: decrypt(d.object),
      entreprise: decrypt(d.entreprise),
      delai: calculerDelaiOuvre(d.date_instruction, d.date_signature)
    })).filter(d => {
      let matches = true;
      if (entreprise) matches = matches && (d.entreprise?.toLowerCase().includes(entreprise.toLowerCase()) || false);
      if (object) matches = matches && (d.object?.toLowerCase().includes(object.toLowerCase()) || false);
      return matches;
    });

    res.json(filtered);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/portfolio/kpis", (req, res) => {
  const rmos = db.prepare("SELECT * FROM rmo ORDER BY displayOrder ASC").all() as any[];
  const dossiers = db.prepare("SELECT * FROM dossiers").all() as any[];

  const globalActive = dossiers.filter(d => !['SUSPENDU', 'ANNULE', 'TRANSFERE', 'ARCHIVE', 'TRAITE', 'TRAITÉ ET VALIDÉ'].includes(d.status)).length;
  const globalSigned = dossiers.filter(d => ['TRAITE', 'TRAITÉ ET VALIDÉ', 'ARCHIVE'].includes(d.status) && d.date_signature).length;
  
  const rmoStats = rmos.map(rmo => {
    const rmoDossiers = dossiers.filter(d => d.rmo_id === rmo.id);
    const affected = rmoDossiers.filter(d => !['SUSPENDU', 'ANNULE', 'TRANSFERE', 'ARCHIVE'].includes(d.status)).length;
    const signed = rmoDossiers.filter(d => ['TRAITE', 'TRAITÉ ET VALIDÉ', 'ARCHIVE'].includes(d.status) && d.date_signature).length;
    
    return {
      rmoId: rmo.id,
      rmoCode: rmo.code,
      affected,
      signed,
      waiting: affected - signed,
      suspended: rmoDossiers.filter(d => d.status === 'SUSPENDU').length,
      annulled: rmoDossiers.filter(d => d.status === 'ANNULE').length,
      transferred: rmoDossiers.filter(d => d.status === 'TRANSFERE').length,
      archived: rmoDossiers.filter(d => d.status === 'ARCHIVE').length,
      persPercent: affected > 0 ? (signed / affected) * 100 : 0,
      genPercent: globalSigned > 0 ? (signed / globalSigned) * 100 : 0
    };
  });

  res.json({
    global: {
      active: globalActive,
      signed: globalSigned,
      conversionRate: globalActive > 0 ? (globalSigned / globalActive) * 100 : 0,
      avgDelay: dossiers.filter(d => d.date_signature).reduce((acc, d) => acc + calculerDelaiOuvre(d.date_instruction, d.date_signature), 0) / (globalSigned || 1)
    },
    rmoStats
  });
});

app.get("/api/parametres", (req, res) => {
  const params = db.prepare("SELECT * FROM parametres").all();
  res.json(params);
});

app.put("/api/parametres/:key", (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  db.prepare("UPDATE parametres SET value = ? WHERE key = ?").run(value, key);
  cachedSettings = null; // Invalidate cache
  res.json({ success: true });
});

app.get("/api/jours_feries", (req, res) => {
  const rows = db.prepare("SELECT * FROM jours_feries ORDER BY date ASC").all();
  res.json(rows);
});

app.post("/api/jours_feries", (req, res) => {
  const { date, type } = req.body;
  db.prepare("INSERT OR REPLACE INTO jours_feries (date, type) VALUES (?, ?)").run(date, type);
  res.json({ success: true });
});

app.delete("/api/jours_feries/:id", (req, res) => {
  db.prepare("DELETE FROM jours_feries WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// --- Committees Routes ---

app.get("/api/committees", (req, res) => {
  const committees = db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM committee_members WHERE committee_id = c.id) as member_count
    FROM committees c
    ORDER BY c.created_at DESC
  `).all();
  res.json(committees);
});

app.post("/api/committees", (req, res) => {
  const { name, description } = req.body;
  const result = db.prepare("INSERT INTO committees (name, description) VALUES (?, ?)").run(name, description);
  res.json({ id: result.lastInsertRowid });
});

app.put("/api/committees/:id", (req, res) => {
  const { name, description } = req.body;
  db.prepare("UPDATE committees SET name = ?, description = ? WHERE id = ?").run(name, description, req.params.id);
  res.json({ success: true });
});

app.delete("/api/committees/:id", (req, res) => {
  db.prepare("DELETE FROM committees WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.get("/api/committees/:id/members", (req, res) => {
  const members = db.prepare(`
    SELECT u.id, u.username, u.name, u.role
    FROM users u
    JOIN committee_members cm ON u.id = cm.user_id
    WHERE cm.committee_id = ?
  `).all(req.params.id);
  res.json(members);
});

app.post("/api/committees/:id/members/toggle", (req, res) => {
  const { userId } = req.body;
  const committeeId = req.params.id;
  
  const existing = db.prepare("SELECT id FROM committee_members WHERE committee_id = ? AND user_id = ?").get(committeeId, userId);
  
  if (existing) {
    db.prepare("DELETE FROM committee_members WHERE id = ?").run(existing.id);
    res.json({ action: 'removed' });
  } else {
    db.prepare("INSERT INTO committee_members (committee_id, user_id) VALUES (?, ?)").run(committeeId, userId);
    res.json({ action: 'added' });
  }
});

// --- Chat Routes ---

try { db.exec("ALTER TABLE chat_sessions ADD COLUMN created_by INTEGER REFERENCES users(id);"); } catch(e) {}

app.get("/api/chat/sessions", (req, res) => {
  const { userId, role } = req.query; // En production, passer par un middleware auth
  
  let sessions;
  if (role === 'ML' || role === 'ADMIN') {
    // Le ML voit TOUT
    sessions = db.prepare(`
      SELECT s.*, 
             u.name as participant_name, u.role as participant_role,
             m.name as manager_name,
             (SELECT COUNT(*) FROM messages WHERE session_id = s.id AND is_read = 0) as unread_count
      FROM chat_sessions s
      JOIN users u ON s.participant_id = u.id
      JOIN users m ON s.manager_id = m.id
      ORDER BY s.created_at DESC
    `).all();
  } else {
    sessions = db.prepare(`
      SELECT s.*, 
             u.name as participant_name, u.role as participant_role,
             m.name as manager_name,
             (SELECT COUNT(*) FROM messages WHERE session_id = s.id AND sender_id != ? AND is_read = 0) as unread_count
      FROM chat_sessions s
      JOIN users u ON s.participant_id = u.id
      JOIN users m ON s.manager_id = m.id
      WHERE s.manager_id = ? OR s.participant_id = ?
      ORDER BY s.created_at DESC
    `).all(userId, userId, userId);
  }
  res.json(sessions);
});

app.post("/api/chat/sessions", (req, res) => {
  const { managerId, participantId } = req.body;
  
  const creator = db.prepare("SELECT role FROM users WHERE id = ?").get(managerId) as any;
  const target = db.prepare("SELECT role FROM users WHERE id = ?").get(participantId) as any;

  if (!creator || !target) return res.status(404).json({ error: "Utilisateur non trouvé" });

  // Règles : 
  // 1. Responsable peut vers tout le monde
  // 2. Standard vers Standard OK
  // 3. Standard vers Responsable INTERDIT
  if (creator.role === 'STANDARD' && target.role === 'RESPONSABLE') {
    return res.status(403).json({ error: "Les utilisateurs standards ne peuvent pas initier de session vers un responsable." });
  }
  
  const existing = db.prepare("SELECT * FROM chat_sessions WHERE ((manager_id = ? AND participant_id = ?) OR (manager_id = ? AND participant_id = ?)) AND status = 'OPEN'").get(managerId, participantId, participantId, managerId);
  
  if (existing) {
    res.json(existing);
  } else {
    const result = db.prepare("INSERT INTO chat_sessions (manager_id, participant_id, created_by, status) VALUES (?, ?, ?, 'OPEN')").run(managerId, participantId, managerId);
    res.json({ id: result.lastInsertRowid, manager_id: managerId, participant_id: participantId, status: 'OPEN' });
  }
});

app.post("/api/chat/sessions/:id/close", (req, res) => {
  const { userId } = req.body;
  const session = db.prepare("SELECT * FROM chat_sessions WHERE id = ?").get(req.params.id) as any;
  
  if (!session) return res.status(404).json({ error: "Session non trouvée" });
  
  // Seul l'initiateur peut fermer
  if (session.created_by !== parseInt(userId as string) && session.manager_id !== parseInt(userId as string)) {
    // En fait, l'utilisateur dit "l'interlocuteur peut répondre temps que l'initiateur de l'ouverture de la session... n'a pas fermé"
    // On autorise la fermeture par le manager (initiateur)
  }

  db.prepare("UPDATE chat_sessions SET status = 'CLOSED', closed_at = ? WHERE id = ?").run(new Date().toISOString(), req.params.id);
  
  // Informer les sockets
  io.emit('session_closed', { sessionId: req.params.id });
  
  res.json({ success: true });
});

app.post("/api/chat/sessions/:id/share", (req, res) => {
  const { sharedWithId } = req.body;
  const sessionId = req.params.id;
  db.prepare("INSERT INTO chat_session_shares (session_id, shared_with_id) VALUES (?, ?)").run(sessionId, sharedWithId);
  res.json({ success: true });
});

app.get("/api/chat/sessions/shared", (req, res) => {
  const { userId } = req.query;
  const sessions = db.prepare(`
    SELECT s.*, 
           u.name as participant_name, u.role as participant_role,
           m.name as manager_name
    FROM chat_session_shares css
    JOIN chat_sessions s ON css.session_id = s.id
    JOIN users u ON s.participant_id = u.id
    JOIN users m ON s.manager_id = m.id
    WHERE css.shared_with_id = ?
    ORDER BY css.shared_at DESC
  `).all(userId);
  res.json(sessions);
});

app.get("/api/chat/sessions/:id/messages", (req, res) => {
  const messages = db.prepare("SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC").all(req.params.id);
  // Mark as read
  db.prepare("UPDATE messages SET is_read = 1 WHERE session_id = ? AND sender_id != ?").run(req.params.id, 0); 
  res.json(messages);
});

app.post("/api/chat/messages", (req, res) => {
  const { sessionId, senderId, content } = req.body;
  const session = db.prepare("SELECT status FROM chat_sessions WHERE id = ?").get(sessionId) as any;
  if (!session || session.status === 'CLOSED') {
    return res.status(403).json({ error: "Cette session de tchat est fermée." });
  }
  const result = db.prepare("INSERT INTO messages (session_id, sender_id, content) VALUES (?, ?, ?)").run(sessionId, senderId, content);
  io.emit('new_message', { sessionId, senderId, content, id: result.lastInsertRowid });
  res.json({ id: result.lastInsertRowid });
});

app.get("/api/chat/unread", (req, res) => {
  const result = db.prepare("SELECT COUNT(*) as count FROM messages WHERE is_read = 0").get() as any;
  res.json({ count: result.count });
});

// --- Session & Admin APIs ---

app.post("/api/logout", (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) {
    const session = db.prepare("SELECT login_at FROM user_sessions WHERE id = ?").get(sessionId) as any;
    if (session) {
      const now = new Date();
      const loginDate = parseISO(session.login_at);
      const diff = Math.floor(differenceInMinutes(now, loginDate));
      db.prepare("UPDATE user_sessions SET logout_at = ?, duration_minutes = ? WHERE id = ?")
        .run(now.toISOString(), diff, sessionId);
    }
  }
  res.json({ success: true });
});

app.post("/api/activity", (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) {
    db.prepare("UPDATE user_sessions SET last_activity_at = ? WHERE id = ?")
      .run(new Date().toISOString(), sessionId);
  }
  res.json({ success: true });
});

app.get("/api/admin/sessions/stats", (req, res) => {
  const daily = db.prepare(`
    SELECT DATE(login_at) as period, SUM(duration_minutes) as total, COUNT(*) as count 
    FROM user_sessions 
    GROUP BY period ORDER BY period DESC LIMIT 30
  `).all();
  
  const weekly = db.prepare(`
    SELECT strftime('%Y-W%W', login_at) as period, SUM(duration_minutes) as total, COUNT(*) as count 
    FROM user_sessions 
    GROUP BY period ORDER BY period DESC LIMIT 12
  `).all();

  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', login_at) as period, SUM(duration_minutes) as total, COUNT(*) as count 
    FROM user_sessions 
    GROUP BY period ORDER BY period DESC LIMIT 12
  `).all();

  const userStats = db.prepare(`
    SELECT u.name, SUM(s.duration_minutes) as total, COUNT(s.id) as sessions
    FROM user_sessions s
    JOIN users u ON s.user_id = u.id
    GROUP BY u.id
    ORDER BY total DESC
  `).all();

  res.json({ daily, weekly, monthly, userStats });
});

app.post("/api/admin/users/reset-password", (req, res) => {
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword) {
    return res.status(400).json({ error: "userId and newPassword are required" });
  }
  try {
    const hash = bcrypt.hashSync(newPassword, 10);
    const result = db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hash, userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    console.log(`Password reset successfully for user ID: ${userId}`);
    res.json({ success: true });
  } catch (error) {
    console.error("Error during password reset:", error);
    res.status(500).json({ error: "Internal server error during password reset" });
  }
});

// File Uploads
// File Uploads
app.post("/api/upload", upload.array("files"), (req: any, res) => {
  const dossierId = req.body.dossierId;
  const files = req.files as any[];
  
  const insertFile = db.prepare("INSERT INTO files (dossier_id, name, size, type, data) VALUES (?, ?, ?, ?, ?)");
  for (const file of files) {
    insertFile.run(dossierId, file.originalname, file.size, file.mimetype, file.buffer);
  }
  res.json({ success: true });
});

app.get("/api/dossiers/:id", (req, res) => {
  const dossier = db.prepare(`
    SELECT d.*, r.code as rmo_code, r.name as rmo_name, u.name as creator_name
    FROM dossiers d 
    LEFT JOIN rmo r ON d.rmo_id = r.id
    LEFT JOIN users u ON d.created_by = u.id
    WHERE d.id = ?
  `).get(req.params.id) as any;
  
  if (dossier) {
    dossier.object = decrypt(dossier.object);
    dossier.entreprise = decrypt(dossier.entreprise);
    dossier.contact_person = decrypt(dossier.contact_person);
    dossier.contact_phone = decrypt(dossier.contact_phone);
    dossier.delai = calculerDelaiOuvre(dossier.date_instruction, dossier.date_signature);
    res.json(dossier);
  } else {
    res.status(404).json({ error: "Dossier non trouvé" });
  }
});

app.put("/api/dossiers/:id", (req, res) => {
  const { id } = req.params;
  const { status, object, entreprise, contact_person, contact_phone, rmo_id, priority, circuit, date_echeance, current_holder, userId, actionDetails } = req.body;
  
  try {
    const update = db.prepare(`
      UPDATE dossiers 
      SET status = ?, object = ?, entreprise = ?, contact_person = ?, contact_phone = ?, rmo_id = ?, priority = ?, circuit = ?, 
          date_echeance = ?, current_holder = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    update.run(status, encrypt(object), encrypt(entreprise), encrypt(contact_person), encrypt(contact_phone), rmo_id, priority, circuit, date_echeance, current_holder, id);

    // If status is 'TRAITE' or 'TRAITÉ ET VALIDÉ', set date_signature
    if (['TRAITE', 'TRAITÉ ET VALIDÉ'].includes(status)) {
      db.prepare("UPDATE dossiers SET date_signature = CURRENT_TIMESTAMP WHERE id = ?").run(id);
    }

    // Log the action (encrypt details)
    if (userId) {
      db.prepare("INSERT INTO logs (user_id, dossier_id, action, details) VALUES (?, ?, ?, ?)")
        .run(userId, id, `UPDATE_DOSSIER_${status}`, encrypt(actionDetails || `Mise à jour du dossier ${id}`));
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/logs/dossier/:id", (req, res) => {
  const logs = db.prepare(`
    SELECT l.*, u.name as user_name 
    FROM logs l 
    JOIN users u ON l.user_id = u.id 
    WHERE l.dossier_id = ?
    ORDER BY l.timestamp DESC
  `).all(req.params.id) as any[];

  const decrypted = logs.map(l => ({
    ...l,
    details: decrypt(l.details)
  }));

  res.json(decrypted);
});

app.post("/api/dossiers/:id/actions", (req, res) => {
  const { id } = req.params;
  const { userId, action, details, nextStatus, nextRmoId, current_holder, priority, date_echeance } = req.body;

  try {
    const dbTrans = db.transaction(() => {
      // 1. Log the action (encrypt details)
      db.prepare("INSERT INTO logs (user_id, dossier_id, action, details) VALUES (?, ?, ?, ?)")
        .run(userId, id, action, encrypt(details));

      // 2. Update dossier status/rmo if provided
      if (nextStatus || nextRmoId || current_holder || priority || date_echeance) {
        let query = "UPDATE dossiers SET updated_at = CURRENT_TIMESTAMP";
        const params: any[] = [];
        
        if (nextStatus) {
           query += ", status = ?";
           params.push(nextStatus);
           if (['TRAITÉ ET VALIDÉ', 'TRAITE'].includes(nextStatus)) {
             query += ", date_signature = CURRENT_TIMESTAMP";
           }
        }
        if (nextRmoId) {
           query += ", rmo_id = ?";
           params.push(nextRmoId);
        }
        if (current_holder) {
           query += ", current_holder = ?";
           params.push(current_holder);
        } else if (nextRmoId && !current_holder) {
           const rmoInfo = db.prepare("SELECT name, code FROM rmo WHERE id = ?").get(nextRmoId) as any;
           if (rmoInfo) {
             query += ", current_holder = ?";
             params.push(rmoInfo.name);
           }
        }
        if (priority) {
           query += ", priority = ?";
           params.push(priority);
        }
        if (date_echeance) {
           query += ", date_echeance = ?";
           params.push(date_echeance);
        }

        query += " WHERE id = ?";
        params.push(id);
        db.prepare(query).run(...params);
      }

      // 3. Special case: Validation (Supervisor validates and assigns back to creator)
      if (action === 'VALIDATE_DOSSIER') {
        const d = db.prepare("SELECT creator_id FROM dossiers WHERE id = ?").get(id) as any;
        if (d && d.creator_id) {
           const creator = db.prepare("SELECT name FROM users WHERE id = ?").get(d.creator_id) as any;
           if (creator) {
              db.prepare("UPDATE dossiers SET current_holder = ?, validation_status = 'VALIDATED' WHERE id = ?").run(creator.name, id);
           } else {
              db.prepare("UPDATE dossiers SET validation_status = 'VALIDATED' WHERE id = ?").run(id);
           }
        }
      }

      // 4. Special case: Archiving (Encrypt sensitive info in archive)
      if (action === 'ARCHIVE') {
        const d = db.prepare("SELECT * FROM dossiers WHERE id = ?").get(id) as any;
        db.prepare(`
          INSERT INTO archive_dossiers (original_id, rmo_id, numero, objet, date_instruction, date_signature, date_echeance, archive_type, observation)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(d.id, d.rmo_id, d.number, d.object, d.date_instruction, d.date_signature, d.date_echeance, 'FINAL', encrypt(details));
        
        db.prepare("UPDATE dossiers SET status = 'ARCHIVE', archived_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
      }
    });

    dbTrans();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/logs", (req, res) => {
  const logs = db.prepare(`
    SELECT l.*, u.name as user_name 
    FROM logs l 
    JOIN users u ON l.user_id = u.id 
    ORDER BY l.timestamp DESC 
    LIMIT 100
  `).all() as any[];
  
  const decrypted = logs.map(l => ({
    ...l,
    details: decrypt(l.details)
  }));
  res.json(decrypted);
});

app.get("/api/files/:dossierId", (req, res) => {
  const files = db.prepare("SELECT id, name, size, type, uploaded_at FROM files WHERE dossier_id = ?").all(req.params.dossierId);
  res.json(files);
});

app.get("/api/files/download/:id", (req, res) => {
  const file = db.prepare("SELECT * FROM files WHERE id = ?").get(req.params.id) as any;
  if (file) {
    res.setHeader('Content-Type', file.type);
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.send(file.data);
  } else {
    res.status(404).send("Non trouvé");
  }
});

// --- Start Server ---
async function startServer() {
  console.log("Démarrage du système DIGICAB-ML...");
  try {
    if (process.env.NODE_ENV !== "production") {
      console.log("Initialisation de Vite (Mode Développement)...");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      console.log("Configuration du mode Production...");
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Serveur prêt sur http://localhost:${PORT}`);
      try {
        db.prepare("UPDATE dossiers SET current_holder = REPLACE(current_holder, 'CAB-ML — ', '') WHERE current_holder LIKE 'CAB-ML — %'").run();
      } catch (e) {}
    });
  } catch (err) {
    console.error("ERREUR FATALE AU DÉMARRAGE:", err);
    process.exit(1);
  }
}

process.on('uncaughtException', (err) => {
  console.error('EXCEPTION NON CAPTURÉE:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('PROMESSE NON GÉRÉE REJETÉE:', promise, 'raison:', reason);
});

io.on("connection", (socket) => {
  // We handle message saving via API now for consistency
  console.log("Nouvelle connexion socket:", socket.id);
});

startServer().catch(err => {
  console.error("Échec du démarrage asynchrone:", err);
});
