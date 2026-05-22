import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export type UploadedFoto = {
  filename: string;
  webPath: string;
  size: number;
  uploadedAt: number;
};

type Session = {
  key: string;
  createdAt: number;
  fotky: UploadedFoto[];
  mobileConnected: boolean;
};

const TTL_MS = 60 * 60 * 1000;

declare global {
  var __uploadSessions: Map<string, Session> | undefined;
}

const sessions: Map<string, Session> = globalThis.__uploadSessions ?? new Map();
globalThis.__uploadSessions = sessions;

function tmpDir(key: string) {
  return path.join(process.cwd(), "public", "uploads", "tmp", key);
}

function purgeExpired() {
  const now = Date.now();
  for (const [k, s] of sessions) {
    if (now - s.createdAt > TTL_MS) {
      sessions.delete(k);
      fs.rm(tmpDir(k), { recursive: true, force: true }).catch(() => {});
    }
  }
}

export function createSession(): Session {
  purgeExpired();
  const key = crypto.randomBytes(12).toString("base64url");
  const session: Session = { key, createdAt: Date.now(), fotky: [], mobileConnected: false };
  sessions.set(key, session);
  return session;
}

export function getSession(key: string): Session | null {
  purgeExpired();
  return sessions.get(key) ?? null;
}

export async function addFoto(key: string, file: File): Promise<UploadedFoto | null> {
  const session = getSession(key);
  if (!session) return null;

  const dir = tmpDir(key);
  await fs.mkdir(dir, { recursive: true });

  const safeName = file.name.replace(/[^\w.-]/g, "_");
  const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, filename), buffer);

  const foto: UploadedFoto = {
    filename,
    webPath: `/uploads/tmp/${key}/${filename}`,
    size: buffer.byteLength,
    uploadedAt: Date.now(),
  };
  session.fotky.push(foto);
  return foto;
}

export async function consumeSession(key: string): Promise<{ filePath: string; webPath: string }[]> {
  const session = sessions.get(key);
  if (!session) return [];
  const dir = tmpDir(key);
  const files = session.fotky.map((f) => ({
    filePath: path.join(dir, f.filename),
    webPath: f.webPath,
  }));
  sessions.delete(key);
  return files;
}

export function setMobileConnected(key: string): boolean {
  const session = getSession(key);
  if (!session) return false;
  session.mobileConnected = true;
  return true;
}

export async function removeFoto(key: string, filename: string): Promise<boolean> {
  const session = getSession(key);
  if (!session) return false;
  const idx = session.fotky.findIndex((f) => f.filename === filename);
  if (idx === -1) return false;
  session.fotky.splice(idx, 1);
  await fs.unlink(path.join(tmpDir(key), filename)).catch(() => {});
  return true;
}

export function dropSessionDir(key: string) {
  return fs.rm(tmpDir(key), { recursive: true, force: true }).catch(() => {});
}
