// src/dbSmokeTest.ts
import { initDb, saveUser, getUser,updateUser, deleteUser } from "./database";

export async function DbSmokeTest() {
  console.log("== DB Smoke Test start ==");

  await initDb();
  console.log("DB initialized");

  const user_id = `test|${Date.now()}`;

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

  let row = await getUser(user_id);
  console.log("Read after insert:", row);

  await updateUser(user_id, 72.4, "updated once");
  console.log("Updated weight/notes");

  row = await getUser(user_id);
  console.log("Read after update:", row);

  await deleteUser(user_id);
  console.log("Deleted user:", user_id);

  row = await getUser(user_id);
  console.log("Read after delete (should be null):", row);

  console.log("== DB Smoke Test done ==");
}

