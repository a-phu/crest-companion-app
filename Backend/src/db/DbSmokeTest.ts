// src/dbSmokeTest.ts
import { initDb, saveUser, getUser, updateUser, deleteUser } from "./db";

export async function runDbSmokeTest() {
  console.log("== DB Smoke Test start ==");

  // Ensure schema is ready
  await initDb();
  console.log("DB initialized");

  // Unique id so tests don't collide
  const user_id = `test|${Date.now()}`;

  // 1) INSERT
  await saveUser({
    user_id,
    name: "Smoke Test User",
    dob: "1995-04-21",
    gender: "other",
    height_cm: 175,
    weight_kg: 70,
    notes: "created in smoke test",
  });
  console.log("Inserted user:", user_id);

  // 2) READ
  let row = await getUser(user_id);
  console.log("Read after insert:", row);

  // 3) UPDATE (partial)
  await updateUser(user_id, { weight_kg: 72.4, notes: "updated once" });
  console.log("Updated weight/notes");

  // 4) READ again
  row = await getUser(user_id);
  console.log("Read after update:", row);

  // 5) DELETE
  await deleteUser(user_id);
  console.log("Deleted user:", user_id);

  // 6) VERIFY deletion
  row = await getUser(user_id);
  console.log("Read after delete (should be null):", row);

  console.log("== DB Smoke Test done ==");
}
