import { saveMessage, getMessage, getMessagesBetween, resetMessagesTableDevOnly, saveUser } from "./database";

export async function DbSmokeTestMessages() {
  console.log("== DB Smoke Test: Messages ==");

  await resetMessagesTableDevOnly();

  // Create two users
  const aliceId = await saveUser({ name: "Alice" });
  const bobId = await saveUser({ name: "Bob" });

  // Send messages
  const m1 = await saveMessage({ sender_id: aliceId, receiver_id: bobId, content: "Hey Bob!" });
  const m2 = await saveMessage({ sender_id: bobId, receiver_id: aliceId, content: "Hi Alice!" });

  console.log("Message 1:", await getMessage(m1));
  console.log("Message 2:", await getMessage(m2));

  console.log("Conversation:", await getMessagesBetween(aliceId, bobId));

  console.log("== DB Smoke Test: Messages done ==");
}
