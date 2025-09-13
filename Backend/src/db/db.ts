// src/db.ts
import * as SQLite from "expo-sqlite";

/**
 * Single on-device DB connection.
 * (Expo keeps this in app sandbox storage.)
 */
export const db = SQLite.openDatabaseSync("wellness.db");

/**
 * I run this once on app start to set PRAGMAs and ensure tables exist.
 * - WAL for better concurrency
 * - foreign_keys for future related tables (e.g., messages)
 * - ISO-8601 UTC timestamps via strftime()
 */
export async function initDb() {
  await db.execAsync("BEGIN");
  try {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        user_id     TEXT PRIMARY KEY,                                   -- stable string id (UUID, external id, etc.)
        name        TEXT,
        dob         TEXT,                                               -- store as "YYYY-MM-DD" (string) or NULL
        gender      TEXT,
        height_cm   INTEGER CHECK (height_cm IS NULL OR height_cm BETWEEN 30 AND 300),
        weight_kg   REAL    CHECK (weight_kg IS NULL OR weight_kg BETWEEN 1 AND 500),
        notes       TEXT,
        created_at  TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), -- ISO-8601 UTC
        updated_at  TEXT
      );
    `);

    // Handy if I frequently sort by recency
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);
    `);

    await db.execAsync("COMMIT");
  } catch (e) {
    await db.execAsync("ROLLBACK");
    throw e;
  }
}

/** Row shape when reading from the users table */
export type UserRow = {
  user_id: string;
  name: string | null;
  dob: string | null;
  gender: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  notes: string | null;
  created_at: string;        // ISO-8601
  updated_at: string | null; // ISO-8601 or null
};

/**
 * Upsert a user row.
 * - If the user_id doesn't exist, insert (and set created_at/updated_at to now).
 * - If it exists, update the fields and updated_at.
 */
export async function saveUser(user: {
  user_id: string;
  name?: string | null;
  dob?: string | null;
  gender?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  notes?: string | null;
}): Promise<void> {
  const now = new Date().toISOString();

  await db.runAsync(
    `
    INSERT INTO users (user_id, name, dob, gender, height_cm, weight_kg, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      name       = excluded.name,
      dob        = excluded.dob,
      gender     = excluded.gender,
      height_cm  = excluded.height_cm,
      weight_kg  = excluded.weight_kg,
      notes      = excluded.notes,
      updated_at = COALESCE(excluded.updated_at, (strftime('%Y-%m-%dT%H:%M:%fZ','now')))
    `,
    [
      user.user_id,
      user.name ?? null,
      user.dob ?? null,
      user.gender ?? null,
      user.height_cm ?? null,
      user.weight_kg ?? null,
      user.notes ?? null,
      now, // created_at on first insert
      now, // updated_at on first insert (and used on conflict via excluded.updated_at)
    ]
  );
}

/**
 * Partial update by user_id (convenience when I don't want to provide all fields).
 * Automatically sets updated_at.
 */
export async function updateUser(
  user_id: string,
  patch: Partial<Omit<UserRow, "user_id" | "created_at">>
): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];
  const push = (col: string, val: any) => {
    fields.push(`${col} = ?`);
    values.push(val);
  };

  if ("name" in patch)      push("name",      patch.name ?? null);
  if ("dob" in patch)       push("dob",       patch.dob ?? null);
  if ("gender" in patch)    push("gender",    patch.gender ?? null);
  if ("height_cm" in patch) push("height_cm", patch.height_cm ?? null);
  if ("weight_kg" in patch) push("weight_kg", patch.weight_kg ?? null);
  if ("notes" in patch)     push("notes",     patch.notes ?? null);

  // always bump updated_at
  push("updated_at", new Date().toISOString());

  if (fields.length === 1) return; // only updated_at touched → optionally no-op
  values.push(user_id);

  await db.runAsync(`UPDATE users SET ${fields.join(", ")} WHERE user_id = ?`, values);
}

/** Read one user by id */
export async function getUser(userId: string): Promise<UserRow | null> {
  const row = await db.getFirstAsync<UserRow>(
    "SELECT * FROM users WHERE user_id = ?",
    [userId]
  );
  return row ?? null;
}

/** Read all users (newest first) */
export async function getAllUsers(): Promise<UserRow[]> {
  return await db.getAllAsync<UserRow>(
    "SELECT * FROM users ORDER BY created_at DESC"
  );
}

/** Delete one user by id */
export async function deleteUser(userId: string): Promise<void> {
  await db.runAsync("DELETE FROM users WHERE user_id = ?", [userId]);
}

/**
 * (Optional) Seed a default user if none exists — handy for first-run dev.
 * Call this after initDb() in your app bootstrap.
 */
export async function ensureDefaultUser(defaultId = "local|dev-user"): Promise<void> {
  const existing = await getUser(defaultId);
  if (!existing) {
    await saveUser({ user_id: defaultId, name: "Test User" });
  }
}
