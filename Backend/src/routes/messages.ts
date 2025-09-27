// backend/src/routes/messages.ts
import { Router } from "express";
import { supa } from "../supabase";
import { HUMAN_ID, AI_ID } from "../id";
import { classifyImportance } from "../importance";

const router = Router();

/** sanity ping */
router.get("/__ping", (_req, res) =>
  res.json({ ok: true, scope: "messages" })
);

/**
 * POST /api/messages/send
 * Body: { text: string, from?: 'user'|'ai' }
 * - Classifies importance + agent_type via OpenAI
 * - Persists the message
 * - Returns inserted row with classification info
 */
router.post("/send", async (req, res) => {
  try {
    const { text, from = "user" } = (req.body || {}) as {
      text?: string;
      from?: "user" | "ai";
    };
    if (!text || !text.trim())
      return res.status(400).json({ error: "text required" });

    const cleaned = text.trim();
    const sender_id = from === "ai" ? AI_ID : HUMAN_ID;
    const receiver_id = from === "ai" ? HUMAN_ID : AI_ID;

    // Classify importance + agent_type
    const { important, agent_type, reason } = await classifyImportance(cleaned);

    const { data, error } = await supa
      .from("message")
      .insert({
        sender_id,
        receiver_id,
        content: cleaned,
        is_important: important,
        agent_type,
      })
      .select("*")
      .single();

    if (error) throw error;

    res.json({ ...data, importance: { important, agent_type, reason } });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "unknown error" });
  }
});

/**
 * GET /api/messages/thread
 * Full Demo Human ↔ AI thread, oldest → newest
 */
router.get("/thread", async (_req, res) => {
  try {
    const { data, error } = await supa
      .from("message")
      .select("*")
      .or(
        `and(sender_id.eq.${HUMAN_ID},receiver_id.eq.${AI_ID}),` +
          `and(sender_id.eq.${AI_ID},receiver_id.eq.${HUMAN_ID})`
      )
      .order("created_at", { ascending: true });

    if (error) throw error;
    res.json(data ?? []);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "unknown error" });
  }
});

/**
 * GET /api/messages/important
 * Latest important items in Human ↔ AI thread (newest first)
 */
router.get("/important", async (_req, res) => {
  try {
    const q = await supa
      .from("message")
      .select("*")
      .or(
        `and(sender_id.eq.${HUMAN_ID},receiver_id.eq.${AI_ID}),` +
          `and(sender_id.eq.${AI_ID},receiver_id.eq.${HUMAN_ID})`
      )
      .eq("is_important", true)
      .order("created_at", { ascending: false })
      .limit(50);

    if (q.error) throw q.error;
    res.json(q.data ?? []);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "unknown error" });
  }
});

export default router;
