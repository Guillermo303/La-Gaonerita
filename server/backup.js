import { fileURLToPath } from 'url';
import { dirname, join, basename, isAbsolute } from 'path';
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, unlinkSync, createReadStream } from 'fs';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Debe resolver la misma ruta que db.js: si DB_FILE apunta a un disco
// persistente (path absoluto), respaldar ese archivo, no el de por defecto.
const DB_PATH = process.env.DB_FILE
  ? (isAbsolute(process.env.DB_FILE) ? process.env.DB_FILE : join(__dirname, process.env.DB_FILE))
  : join(__dirname, 'data.db');
const BACKUP_DIR = process.env.BACKUP_DIR
  ? (isAbsolute(process.env.BACKUP_DIR) ? process.env.BACKUP_DIR : join(__dirname, process.env.BACKUP_DIR))
  : join(__dirname, 'backups');
const MAX_BACKUPS = Number(process.env.BACKUP_KEEP) || 30;

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export function runBackup() {
  if (!existsSync(DB_PATH)) return null;
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });

  const dest = join(BACKUP_DIR, `data-${timestamp()}.db`);
  copyFileSync(DB_PATH, dest);

  const files = readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('data-') && f.endsWith('.db'))
    .map(f => ({ name: f, time: statSync(join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  for (const old of files.slice(MAX_BACKUPS)) {
    unlinkSync(join(BACKUP_DIR, old.name));
  }

  return dest;
}

function driveConfigured() {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_KEY && process.env.GOOGLE_DRIVE_FOLDER_ID && existsSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY));
}

async function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });
  return google.drive({ version: 'v3', auth });
}

export async function uploadToDrive(filePath) {
  if (!driveConfigured()) return null;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  try {
    const drive = await getDriveClient();
    const res = await drive.files.create({
      requestBody: { name: basename(filePath), parents: [folderId] },
      media: { mimeType: 'application/x-sqlite3', body: createReadStream(filePath) },
      fields: 'id'
    });

    const list = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, createdTime)',
      orderBy: 'createdTime desc',
      pageSize: 1000
    });
    const old = (list.data.files || []).slice(MAX_BACKUPS);
    for (const f of old) {
      await drive.files.delete({ fileId: f.id }).catch(() => {});
    }

    return res.data.id;
  } catch (err) {
    console.error('Error al subir el backup a Google Drive:', err.message);
    return null;
  }
}

export async function runBackupAndUpload() {
  const dest = runBackup();
  if (dest) {
    if (driveConfigured()) {
      const fileId = await uploadToDrive(dest);
      if (fileId) console.log(`Backup subido a Google Drive (${basename(dest)})`);
    } else {
      console.log('Backup local creado. Sube a Google Drive no configurada (revisa GOOGLE_SERVICE_ACCOUNT_KEY y GOOGLE_DRIVE_FOLDER_ID en .env)');
    }
  }
  return dest;
}

export function startBackupSchedule(intervalHours = 6) {
  runBackupAndUpload();
  const ms = intervalHours * 60 * 60 * 1000;
  return setInterval(runBackupAndUpload, ms);
}
