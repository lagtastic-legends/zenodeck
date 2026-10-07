import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

export interface ZenoTapDeckItem {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  width?: number | null;
  height?: number | null;
  mimeType: string;
  tags?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ZenoTapDeviceLink {
  id: string;
  userId: string;
  pairCode: string;
  syncToken: string;
  deviceName?: string | null;
  expiresAt: number;
  createdAt: number;
}

let dbInstance: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  const dbDir = path.join(process.cwd(), "db");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, "custom.db");
  const db = new DatabaseSync(dbPath);

  // WAL mode for fast concurrent operations & durability
  db.exec("PRAGMA journal_mode = WAL;");

  // Initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS zenotap_deck_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      url TEXT NOT NULL,
      size INTEGER NOT NULL,
      width INTEGER,
      height INTEGER,
      mime_type TEXT NOT NULL DEFAULT 'image/gif',
      tags TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_zenotap_deck_user ON zenotap_deck_items(user_id);

    CREATE TABLE IF NOT EXISTS zenotap_device_links (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      pair_code TEXT UNIQUE NOT NULL,
      sync_token TEXT UNIQUE NOT NULL,
      device_name TEXT,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_zenotap_links_user ON zenotap_device_links(user_id);
    CREATE INDEX IF NOT EXISTS idx_zenotap_links_token ON zenotap_device_links(sync_token);
    CREATE INDEX IF NOT EXISTS idx_zenotap_links_code ON zenotap_device_links(pair_code);

    CREATE TABLE IF NOT EXISTS zenotap_nonces (
      nonce TEXT PRIMARY KEY,
      expires_at INTEGER NOT NULL
    );
  `);

  dbInstance = db;
  return dbInstance;
}

export const zenoTapDb = {
  getUserDeck(userId: string): ZenoTapDeckItem[] {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT id, user_id as userId, filename, original_name as originalName, 
             url, size, width, height, mime_type as mimeType, tags, 
             created_at as createdAt, updated_at as updatedAt
      FROM zenotap_deck_items 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `);
    return stmt.all(userId) as unknown as ZenoTapDeckItem[];
  },

  addDeckItem(item: Omit<ZenoTapDeckItem, "createdAt" | "updatedAt">): ZenoTapDeckItem {
    const db = getDb();
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO zenotap_deck_items (
        id, user_id, filename, original_name, url, size, width, height, mime_type, tags, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      item.id,
      item.userId,
      item.filename,
      item.originalName,
      item.url,
      item.size,
      item.width ?? null,
      item.height ?? null,
      item.mimeType,
      item.tags ?? null,
      now,
      now
    );
    return {
      ...item,
      createdAt: now,
      updatedAt: now,
    };
  },

  deleteDeckItem(id: string, userId: string): boolean {
    const db = getDb();
    const stmt = db.prepare(`DELETE FROM zenotap_deck_items WHERE id = ? AND user_id = ?`);
    const result = stmt.run(id, userId);
    return (result.changes ?? 0) > 0;
  },

  createPairCode(userId: string, pairCode: string, expiresAt: number): void {
    const db = getDb();
    const now = Date.now();
    // Clean up expired pair codes first
    db.prepare(`DELETE FROM zenotap_device_links WHERE expires_at < ? AND device_name IS NULL`).run(now);

    const stmt = db.prepare(`
      INSERT INTO zenotap_device_links (id, user_id, pair_code, sync_token, device_name, expires_at, created_at)
      VALUES (?, ?, ?, ?, NULL, ?, ?)
    `);
    const id = `link_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    // Temporary placeholder sync token until confirmed
    const tempToken = `pending_${pairCode}_${Date.now()}`;
    stmt.run(id, userId, pairCode, tempToken, expiresAt, now);
  },

  confirmPairCode(pairCode: string, deviceName: string, activeSyncToken: string): { userId: string } | null {
    const db = getDb();
    const now = Date.now();
    const checkStmt = db.prepare(`
      SELECT id, user_id as userId, expires_at as expiresAt 
      FROM zenotap_device_links 
      WHERE pair_code = ? AND expires_at >= ?
    `);
    const row = checkStmt.get(pairCode, now) as { id: string; userId: string; expiresAt: number } | undefined;
    if (!row) return null;

    // Permanent 1-year sync token for the paired device
    const updateStmt = db.prepare(`
      UPDATE zenotap_device_links 
      SET sync_token = ?, device_name = ?, expires_at = ? 
      WHERE id = ?
    `);
    const oneYear = now + 365 * 24 * 60 * 60 * 1000;
    updateStmt.run(activeSyncToken, deviceName || "Android Keyboard", oneYear, row.id);

    return { userId: row.userId };
  },

  getDeviceLinkBySyncToken(syncToken: string): ZenoTapDeviceLink | null {
    const db = getDb();
    const now = Date.now();
    const stmt = db.prepare(`
      SELECT id, user_id as userId, pair_code as pairCode, sync_token as syncToken, 
             device_name as deviceName, expires_at as expiresAt, created_at as createdAt
      FROM zenotap_device_links
      WHERE sync_token = ? AND expires_at >= ?
    `);
    const row = stmt.get(syncToken, now) as unknown as ZenoTapDeviceLink | undefined;
    return row || null;
  },

  checkAndStoreNonce(nonce: string, expiresAt: number): boolean {
    const db = getDb();
    const now = Date.now();
    // Purge expired nonces periodically
    db.prepare(`DELETE FROM zenotap_nonces WHERE expires_at < ?`).run(now);

    try {
      const stmt = db.prepare(`INSERT INTO zenotap_nonces (nonce, expires_at) VALUES (?, ?)`);
      stmt.run(nonce, expiresAt);
      return true; // Successfully registered
    } catch {
      return false; // Already exists (replay attack!)
    }
  },
};
