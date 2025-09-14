// src/db.ts
import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("wellness.db");

// Init table
export function initDb() {
    db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      user_id     TEXT PRIMARY KEY,
      name        TEXT,
      dob         TEXT,
      gender      TEXT,
      height_cm   INTEGER,
      weight_kg   REAL,
      notes       TEXT,
      created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at  TEXT
    );
  `);
}

// Save or update user (upsert)
export async function saveUser(user: {
    user_id: string;
    name?: string;
    dob?: string;
    gender?: string;
    height_cm?: number;
    weight_kg?: number;
    notes?: string;
}) {
    const now = new Date().toISOString();
    await db.runAsync(
        `
    INSERT INTO users (user_id, name, dob, gender, height_cm, weight_kg, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      name=excluded.name,
      dob=excluded.dob,
      gender=excluded.gender,
      height_cm=excluded.height_cm,
      weight_kg=excluded.weight_kg,
      notes=excluded.notes,
      updated_at=excluded.updated_at
  `,
        [
            user.user_id,
            user.name ?? null,
            user.dob ?? null,
            user.gender ?? null,
            user.height_cm ?? null,
            user.weight_kg ?? null,
            user.notes ?? null,
            now,
            now,
        ]
    );
}
// Update only weight_kg and notes for a given user
export async function updateUser(
  user_id: string,
  weight_kg: number,
  notes: string
) {
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE users
     SET weight_kg = ?, notes = ?, updated_at = ?
     WHERE user_id = ?`,
    [weight_kg, notes, now, user_id]
  );
}
// Get a single user
export async function getUser(userId: string) {
    return await db.getFirstAsync("SELECT * FROM users WHERE user_id = ?", [userId]);
}

// Get all users (optional)
export async function getAllUsers() {
    return await db.getAllAsync("SELECT * FROM users ORDER BY created_at DESC");
}

// Delete a user
export async function deleteUser(userId: string) {
    await db.runAsync("DELETE FROM users WHERE user_id = ?", [userId]);
}
