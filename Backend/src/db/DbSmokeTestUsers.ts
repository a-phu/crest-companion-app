import { initDb, saveUser, getUser, updateUser, deleteUser, getAllUsers, resetUsersTableDevOnly } from "./database";

export async function DbSmokeTestUsers() {
  console.log("== DB Smoke Test: Users ==");

  await initDb();
  console.log("DB initialized");

  // Reset (dev only, starts from ID=1)
  // await resetUsersTableDevOnly();
  // console.log("Users table reset");

  // Insert first user
  const id1 : number = await saveUser({
    name: "Alice",
    dob: "1990-01-01",
    gender: "female",
    height_cm: 165,
    weight_kg: 60,
    notes: "first user",
  });
  console.log("Inserted user 1 with ID:", id1);

  // Insert second user
  const id2 = await saveUser({
    name: "Bob",
    dob: "1992-06-15",
    gender: "male",
    height_cm: 180,
    weight_kg: 80,
    notes: "second user",
  });
  console.log("Inserted user 2 with ID:", id2);

  // Read both
  console.log("Get user 1:", await getUser(id1));
  console.log("Get user 2:", await getUser(id2));

  // Update Alice
  await updateUser(id1, 62, "updated Alice");
  console.log("Updated Alice →", await getUser(id1));

  // Delete Bob
  await deleteUser(id2);
  console.log("Deleted Bob →", await getUser(id2));

  // Get all remaining users
  console.log("All users:", await getAllUsers());

  console.log("== DB Smoke Test done ==");
}