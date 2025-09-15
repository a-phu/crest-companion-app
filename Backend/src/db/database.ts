import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";

export const db = SQLite.openDatabaseSync("wellness.db");

/**
 * Initialize database from schema.sql file
 */
export async function initDb() {
  // Ensure schema.sql is bundled as an asset
  const schemaAsset = Asset.fromModule(require("./wellnessschema.txt"));
  await schemaAsset.downloadAsync(); // download if needed

  const schemaPath = schemaAsset.localUri!;
  const schemaSql = await FileSystem.readAsStringAsync(schemaPath);

  // Execute schema statements
  await db.execAsync(schemaSql);

  console.log("DB schema initialized from wellnessschema.sql");
}

// ---------- USERS CRUD ----------

export async function saveUser(user: {
  name?: string;
  dob?: string;
  gender?: string;
  height_cm?: number;
  weight_kg?: number;
  notes?: string;
}): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO users (name, dob, gender, height_cm, weight_kg, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
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
  return result.lastInsertRowId as number;
}

export async function updateUser(user_id: number, weight_kg: number, notes: string) {
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE users SET weight_kg = ?, notes = ?, updated_at = ? WHERE user_id = ?`,
    [weight_kg, notes, now, user_id]
  );
}

export async function getUser(userId: number) {
  return await db.getFirstAsync("SELECT * FROM users WHERE user_id = ?", [userId]);
}

export async function getAllUsers() {
  return await db.getAllAsync("SELECT * FROM users ORDER BY created_at DESC");
}

export async function deleteUser(userId: number) {
  await db.runAsync("DELETE FROM users WHERE user_id = ?", [userId]);
}

export async function resetUsersTableDevOnly() {
  console.warn("[DB] Resetting users table (DEV ONLY)");

  // Drop the table completely
  await db.execAsync("DROP TABLE IF EXISTS users;");

  // Re-run schema creation (loads your wellnessschema.sql)
  await initDb();
}

////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////

// ---------- MESSAGES CRUD ----------

export async function saveMessage(msg: {
  sender_id: number;
  receiver_id: number;
  content: string;
}): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO messages (sender_id, receiver_id, content, created_at)
     VALUES (?, ?, ?, ?)`,
    [msg.sender_id, msg.receiver_id, msg.content, now]
  );
  return result.lastInsertRowId as number;
}

export async function getMessage(messageId: number) {
  return await db.getFirstAsync("SELECT * FROM messages WHERE message_id = ?", [messageId]);
}

export async function getMessagesBetween(userA: number, userB: number) {
  return await db.getAllAsync(
    `SELECT * FROM messages
     WHERE (sender_id = ? AND receiver_id = ?)
        OR (sender_id = ? AND receiver_id = ?)
     ORDER BY created_at ASC`,
    [userA, userB, userB, userA]
  );
}

export async function deleteMessage(messageId: number) {
  await db.runAsync("DELETE FROM messages WHERE message_id = ?", [messageId]);
}

export async function getAllMessages() {
  return await db.getAllAsync("SELECT * FROM messages ORDER BY created_at DESC");
}

export async function resetMessagesTableDevOnly() {
  console.warn("[DB] Resetting messages table (DEV ONLY)");
  await db.execAsync("DROP TABLE IF EXISTS messages;");
  await initDb();
}
