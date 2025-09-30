// //backend/src/routes/chat.ts
// import { Router } from "express";
// import { supa } from "../supabase";
// import { openai } from "../OpenaiClient";
// import { AI_ID } from "../id";
// import { classifyImportance } from "../importance";
// import { Profiler } from "../profiler";

// // -----------------------------
// // Types for DB rows and context
// // -----------------------------
// type MessageRow = {
//   message_id: string;
//   sender_id: string;
//   receiver_id: string;
//   content: string;
//   is_important?: boolean | null;
//   created_at: string; // ISO
//   agent_type?: string | null;
// };

// type ChatMessage =
//   | { role: "system"; content: string }
//   | { role: "user"; content: string }
//   | { role: "assistant"; content: string };

// type Importance = {
//   important: boolean;
//   agent_type: string; // cognition | identity | mind | clinical | nutrition | training | body | sleep | other
//   reason?: string;
// };

// const router = Router();

// const UUID_RE =
//   /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// // -----------------------------
// // Utilities
// // -----------------------------
// function looksLikeProgramAsk(s: string): boolean {
//   const t = (s || "").toLowerCase();
//   return (
//     /\b(program|plan|routine|split|template|schedule)\b/.test(t) ||
//     /\bweek\s*\d\b/.test(t) ||
//     /\b\d+\s*week\b/.test(t)
//   );
// }

// async function classifyWithRetry(text: string, P: Profiler, label: "user" | "ai"): Promise<Importance> {
//   const fallback: Importance = {
//     important: false,
//     agent_type: "other",
//     reason: "classification failed",
//   };
//   try {
//     const t0 = process.hrtime.bigint();
//     const r = await classifyImportance(text);
//     const t1 = process.hrtime.bigint();
//     P.mark(`classify_${label}_done`, { ms_inner: Number(t1 - t0) / 1_000_000 });
//     return r;
//   } catch {
//     await new Promise((r) => setTimeout(r, 150));
//     try {
//       const t0 = process.hrtime.bigint();
//       const r = await classifyImportance(text);
//       const t1 = process.hrtime.bigint();
//       P.mark(`classify_${label}_done_retry`, { ms_inner: Number(t1 - t0) / 1_000_000 });
//       return r;
//     } catch {
//       P.mark(`classify_${label}_failed`);
//       return fallback;
//     }
//   }
// }

// async function assertHuman(humanId: string): Promise<void> {
//   if (!UUID_RE.test(humanId)) {
//     throw new Error("invalid humanId (not a UUID)");
//   }
//   const q = await supa
//     .from("app_user")
//     .select("user_id,user_type")
//     .eq("user_id", humanId)
//     .maybeSingle();
//   if (q.error) throw q.error;
//   if (!q.data || q.data.user_type !== "human") {
//     throw new Error("humanId not found or not a human user");
//   }
// }

// // -----------------------------
// // Context builders (parallel-friendly)
// // -----------------------------
// type BaseContext = {
//   rows: MessageRow[];
//   ids: Set<string>;
//   oldestTs: string; // oldest message in `rows`
//   messages: ChatMessage[];
// };

// async function fetchBaseContext(humanId: string, P: Profiler): Promise<BaseContext> {
//   const t0 = process.hrtime.bigint();
//   // recent 12 (desc -> asc)
//   const recentQ = await supa
//     .from("message")
//     .select(
//       "message_id,sender_id,receiver_id,content,is_important,created_at,agent_type"
//     )
//     .or(
//       `and(sender_id.eq.${humanId},receiver_id.eq.${AI_ID}),` +
//         `and(sender_id.eq.${AI_ID},receiver_id.eq.${humanId})`
//     )
//     .order("created_at", { ascending: false })
//     .limit(12);
//   if (recentQ.error) throw recentQ.error;

//   const recent: MessageRow[] = (recentQ.data ?? []) as MessageRow[];
//   recent.reverse();

//   const ids = new Set(recent.map((m) => m.message_id));
//   const oldestTs = recent[0]?.created_at ?? new Date().toISOString();

//   // boosters: earlier important within 90d
//   const since90 = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
//   const impQ = await supa
//     .from("message")
//     .select(
//       "message_id,sender_id,receiver_id,content,is_important,created_at,agent_type"
//     )
//     .or(
//       `and(sender_id.eq.${humanId},receiver_id.eq.${AI_ID}),` +
//         `and(sender_id.eq.${AI_ID},receiver_id.eq.${humanId})`
//     )
//     .eq("is_important", true)
//     .lt("created_at", oldestTs)
//     .gte("created_at", since90)
//     .order("created_at", { ascending: false })
//     .limit(10);
//   if (impQ.error) throw impQ.error;

//   const boosters: MessageRow[] = [];
//   for (const m of (impQ.data ?? []) as MessageRow[]) {
//     if (!ids.has(m.message_id)) boosters.push(m);
//     if (boosters.length >= 3) break;
//   }
//   boosters.reverse();

//   const rows = [...boosters, ...recent];
//   const messages: ChatMessage[] = rows.map((m) => ({
//     role: m.sender_id === humanId ? "user" : "assistant",
//     content: String(m.content ?? ""),
//   }));

//   for (const b of boosters) ids.add(b.message_id);

//   const t1 = process.hrtime.bigint();
//   P.mark("fetch_base_ctx_done", {
//     recent: recent.length,
//     boosters: boosters.length,
//     ms_inner: Number(t1 - t0) / 1_000_000,
//   });

//   return { rows, ids, oldestTs, messages };
// }

// async function fetchRagSlice(
//   humanId: string,
//   agentType: string | null | undefined,
//   oldestTs: string,
//   blockIds: Set<string>,
//   P: Profiler
// ): Promise<ChatMessage[]> {
//   if (!agentType || agentType === "other") {
//     P.mark("rag_skip_no_agent_type");
//     return [];
//   }

//   const t0 = process.hrtime.bigint();
//   const ragQ = await supa
//     .from("message")
//     .select(
//       "message_id,sender_id,receiver_id,content,is_important,created_at,agent_type"
//     )
//     .or(
//       `and(sender_id.eq.${humanId},receiver_id.eq.${AI_ID}),` +
//         `and(sender_id.eq.${AI_ID},receiver_id.eq.${humanId})`
//     )
//     .eq("agent_type", agentType)
//     .lt("created_at", oldestTs)
//     .order("created_at", { ascending: false })
//     .limit(8);
//   if (ragQ.error) throw ragQ.error;

//   let ragRows: MessageRow[] = ((ragQ.data ?? []) as MessageRow[]).filter(
//     (m) => !blockIds.has(m.message_id)
//   );

//   ragRows.sort(
//     (a: MessageRow, b: MessageRow) =>
//       new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
//   );
//   if (ragRows.length > 4) ragRows = ragRows.slice(-4);

//   const out = ragRows.map<ChatMessage>((m) => ({
//     role: m.sender_id === humanId ? "user" : "assistant",
//     content: String(m.content ?? ""),
//   }));
//   const t1 = process.hrtime.bigint();
//   P.mark("fetch_rag_slice_done", {
//     agentType,
//     count: out.length,
//     ms_inner: Number(t1 - t0) / 1_000_000,
//   });
//   return out;
// }

// // -----------------------------
// // Route
// // -----------------------------
// router.get("/__ping", (_req, res) => res.json({ ok: true, scope: "chat" }));

// router.post("/:humanId", async (req, res) => {
//   const P = new Profiler();
//   try {
//     const humanId = String(req.params.humanId);
//     const text = String(req.body?.text ?? "").trim();
//     if (!text) return res.status(400).json({ error: "text required" });

//     // Validate human
//     await assertHuman(humanId);
//     P.mark("assert_human_ok");

//     // 1) Save user message immediately
//     const ins0 = await supa
//       .from("message")
//       .insert({ sender_id: humanId, receiver_id: AI_ID, content: text })
//       .select("message_id")
//       .single();
//     if (ins0.error) throw ins0.error;
//     P.mark("save_user_msg");

//     // 2) Kick off in parallel: classification + base context
//     const userClassifyP = classifyWithRetry(text, P, "user");
//     const baseCtxP = fetchBaseContext(humanId, P);

//     // Cheap hint while classification runs
//     const programHint = looksLikeProgramAsk(text);

//     const [userImp, baseCtx] = await Promise.all([userClassifyP, baseCtxP]);
//     P.mark("after_user_classify_and_basectx", { agent_type: userImp.agent_type });

//     // 3) RAG-lite slice using agent_type
//     const ragSlice = await fetchRagSlice(
//       humanId,
//       userImp.agent_type,
//       baseCtx.oldestTs,
//       baseCtx.ids,
//       P
//     );

//     const ctx: ChatMessage[] = [...ragSlice, ...baseCtx.messages];
//     P.mark("ctx_ready", { total_msgs: ctx.length });

//     // 4) Dynamic system prompt
//     let systemPrompt =
//       "You are a fitness & wellbeing companion. Keep replies practical and concise.\n" +
//       "If the user expresses urgency (today/tomorrow/ASAP/deadlines), provide step-by-step, time-sensitive actions.\n";

//     if (programHint || userImp.agent_type === "training") {
//       systemPrompt +=
//         "\nWhen the user asks for a program/plan, output a structured plan with:\n" +
//         "- Duration (weeks) and weekly schedule (days)\n" +
//         "- Exercises with sets×reps (or time), rest, and progression guidance\n" +
//         "- Variations for limited equipment if requested\n" +
//         "- Safety/form notes\n" +
//         "Prefer clear lists over paragraphs.\n";
//     }
//     const messages: ChatMessage[] = [{ role: "system", content: systemPrompt }, ...ctx];
//     P.mark("build_prompt");

//     // 5) Model call
//     const t0 = process.hrtime.bigint();
//     const resp = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       temperature: 0.3,
//       max_tokens: 500,
//       messages,
//     });
//     const t1 = process.hrtime.bigint();
//     P.mark("openai_complete", { ms_inner: Number(t1 - t0) / 1_000_000 });

//     const reply =
//       resp.choices?.[0]?.message?.content?.trim() || "Sorry, I had trouble replying.";

//     // 6) Start AI classification and user-row update in parallel
//     const aiClassifyP = classifyWithRetry(reply, P, "ai");
//     const userUpdateP = supa
//       .from("message")
//       .update({
//         is_important: userImp.important,
//         agent_type: userImp.agent_type,
//       })
//       .eq("message_id", ins0.data!.message_id);

//     const [aiImp, userUpd] = await Promise.all([aiClassifyP, userUpdateP]);
//     if ((userUpd as any)?.error) throw (userUpd as any).error;
//     P.mark("after_ai_classify_and_user_update");

//     // 7) Insert AI reply row
//     const ins1 = await supa
//       .from("message")
//       .insert({
//         sender_id: AI_ID,
//         receiver_id: humanId,
//         content: reply,
//       })
//       .select("message_id")
//       .single();
//     if (ins1.error) throw ins1.error;
//     P.mark("insert_ai_msg");

//     // 8) Patch AI row with importance + agent_type
//     const upd1 = await supa
//       .from("message")
//       .update({
//         is_important: aiImp.important,
//         agent_type: aiImp.agent_type,
//       })
//       .eq("message_id", ins1.data!.message_id);
//     if (upd1.error) throw upd1.error;
//     P.mark("update_ai_msg");

//     // 9) Attach profiling (optional header + body when enabled)
//     const profile = P.report();
//     if (process.env.CHAT_PROFILING === "1") {
//       console.log(JSON.stringify({ reqId: P.id, profile }, null, 2));
//       const total = profile.find((p) => p.step === "TOTAL")?.ms ?? 0;
//       res.setHeader("X-Chat-Total-MS", String(total));
//     }

//     res.json({
//       reply,
//       meta: {
//         userImportance: userImp,
//         aiImportance: aiImp,
//         ...(process.env.CHAT_PROFILING === "1" ? { profile } : {}),
//       },
//     });
//   } catch (err: any) {
//     const profile = P.report();
//     console.error(JSON.stringify({ reqId: P.id, error: err?.message, profile }, null, 2));
//     res.status(500).json({ error: err?.message || "unknown error" });
//   }
// });

// export default router;
// backend/src/routes/chat.ts
import { Router, type Response } from "express";
import { supa } from "../supabase";
import { openai } from "../OpenaiClient";
import { AI_ID } from "../id";
import { classifyImportance } from "../importance";
import { Profiler } from "../profiler";

// -----------------------------
// Types for DB rows and context
// -----------------------------
type MessageRow = {
  message_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_important?: boolean | null;
  created_at: string; // ISO
  agent_type?: string | null;
};

type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string };

type Importance = {
  important: boolean;
  agent_type: string; // cognition | identity | mind | clinical | nutrition | training | body | sleep | other
  reason?: string;
};

const router = Router();

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// -----------------------------
// Helpers
// -----------------------------
function looksLikeProgramAsk(s: string): boolean {
  const t = (s || "").toLowerCase();
  return (
    /\b(program|plan|routine|split|template|schedule)\b/.test(t) ||
    /\bweek\s*\d\b/.test(t) ||
    /\b\d+\s*week\b/.test(t)
  );
}

function attachTimingHeaders(
  res: Response,
  profile: Array<{ step: string; ms: number }>
) {
  try {
    const total = profile.find((p) => p.step === "TOTAL")?.ms ?? 0;
    const serverTiming = profile
      .filter((p) => p.step !== "TOTAL")
      .map(
        (p) =>
          `${p.step.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60)};dur=${p.ms.toFixed(1)}`
      )
      .join(", ");
    if (serverTiming) res.setHeader("Server-Timing", serverTiming);
    res.setHeader("X-Chat-Total-MS", String(total.toFixed(1)));
  } catch {
    /* noop */
  }
}

async function classifyWithRetry(
  text: string,
  P: Profiler,
  label: "user" | "ai"
): Promise<Importance> {
  const fallback: Importance = {
    important: false,
    agent_type: "other",
    reason: "classification failed",
  };
  try {
    const t0 = process.hrtime.bigint();
    const r = await classifyImportance(text);
    const t1 = process.hrtime.bigint();
    P.mark(`classify_${label}_done`, { ms_inner: Number(t1 - t0) / 1_000_000 });
    return r;
  } catch {
    await new Promise((r) => setTimeout(r, 150));
    try {
      const t0 = process.hrtime.bigint();
      const r = await classifyImportance(text);
      const t1 = process.hrtime.bigint();
      P.mark(`classify_${label}_done_retry`, {
        ms_inner: Number(t1 - t0) / 1_000_000,
      });
      return r;
    } catch {
      P.mark(`classify_${label}_failed`);
      return fallback;
    }
  }
}

async function assertHuman(humanId: string): Promise<void> {
  if (!UUID_RE.test(humanId)) {
    throw new Error("invalid humanId (not a UUID)");
  }
  const q = await supa
    .from("app_user")
    .select("user_id,user_type")
    .eq("user_id", humanId)
    .maybeSingle();
  if (q.error) throw q.error;
  if (!q.data || q.data.user_type !== "human") {
    throw new Error("humanId not found or not a human user");
  }
}

// -----------------------------
// Context builders (parallel-friendly)
// -----------------------------
type BaseContext = {
  rows: MessageRow[];
  ids: Set<string>;
  oldestTs: string; // oldest message in `rows`
  messages: ChatMessage[];
};

async function fetchBaseContext(
  humanId: string,
  P: Profiler
): Promise<BaseContext> {
  // recent 12 (desc -> asc)
  const q0 = process.hrtime.bigint();
  const recentQ = await supa
    .from("message")
    .select(
      "message_id,sender_id,receiver_id,content,is_important,created_at,agent_type"
    )
    .or(
      `and(sender_id.eq.${humanId},receiver_id.eq.${AI_ID}),` +
        `and(sender_id.eq.${AI_ID},receiver_id.eq.${humanId})`
    )
    .order("created_at", { ascending: false })
    .limit(12);
  const q1 = process.hrtime.bigint();
  if (recentQ.error) throw recentQ.error;
  P.mark("fetch_recent_done", {
    ms_inner: Number(q1 - q0) / 1_000_000,
    count: (recentQ.data ?? []).length,
  });

  const recent: MessageRow[] = (recentQ.data ?? []) as MessageRow[];
  recent.reverse();

  const ids = new Set(recent.map((m) => m.message_id));
  const oldestTs = recent[0]?.created_at ?? new Date().toISOString();

  // boosters: earlier important within 90d
  const since90 = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
  const q2 = process.hrtime.bigint();
  const impQ = await supa
    .from("message")
    .select(
      "message_id,sender_id,receiver_id,content,is_important,created_at,agent_type"
    )
    .or(
      `and(sender_id.eq.${humanId},receiver_id.eq.${AI_ID}),` +
        `and(sender_id.eq.${AI_ID},receiver_id.eq.${humanId})`
    )
    .eq("is_important", true)
    .lt("created_at", oldestTs)
    .gte("created_at", since90)
    .order("created_at", { ascending: false })
    .limit(10);
  const q3 = process.hrtime.bigint();
  if (impQ.error) throw impQ.error;
  P.mark("fetch_boosters_done", {
    ms_inner: Number(q3 - q2) / 1_000_000,
    total_considered: (impQ.data ?? []).length,
  });

  const boosters: MessageRow[] = [];
  for (const m of (impQ.data ?? []) as MessageRow[]) {
    if (!ids.has(m.message_id)) boosters.push(m);
    if (boosters.length >= 3) break;
  }
  boosters.reverse();

  const rows = [...boosters, ...recent];

  const m0 = process.hrtime.bigint();
  const messages: ChatMessage[] = rows.map((m) => ({
    role: m.sender_id === humanId ? "user" : "assistant",
    content: String(m.content ?? ""),
  }));
  const m1 = process.hrtime.bigint();
  P.mark("map_rows_to_messages", {
    ms_inner: Number(m1 - m0) / 1_000_000,
    rows: rows.length,
  });

  P.mark("fetch_base_ctx_done", {
    recent: recent.length,
    boosters: boosters.length,
  });

  return { rows, ids, oldestTs, messages };
}

async function fetchRagSlice(
  humanId: string,
  agentType: string | null | undefined,
  oldestTs: string,
  blockIds: Set<string>,
  P: Profiler
): Promise<ChatMessage[]> {
  if (!agentType || agentType === "other") {
    P.mark("rag_skip_no_agent_type");
    return [];
  }

  const r0 = process.hrtime.bigint();
  const ragQ = await supa
    .from("message")
    .select(
      "message_id,sender_id,receiver_id,content,is_important,created_at,agent_type"
    )
    .or(
      `and(sender_id.eq.${humanId},receiver_id.eq.${AI_ID}),` +
        `and(sender_id.eq.${AI_ID},receiver_id.eq.${humanId})`
    )
    .eq("agent_type", agentType)
    .lt("created_at", oldestTs)
    .order("created_at", { ascending: false })
    .limit(8);
  const r1 = process.hrtime.bigint();
  if (ragQ.error) throw ragQ.error;
  P.mark("fetch_rag_query_done", {
    ms_inner: Number(r1 - r0) / 1_000_000,
    raw: (ragQ.data ?? []).length,
  });

  let ragRows: MessageRow[] = ((ragQ.data ?? []) as MessageRow[]).filter(
    (m) => !blockIds.has(m.message_id)
  );

  ragRows.sort(
    (a: MessageRow, b: MessageRow) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  if (ragRows.length > 4) ragRows = ragRows.slice(-4);

  const map0 = process.hrtime.bigint();
  const out = ragRows.map<ChatMessage>((m) => ({
    role: m.sender_id === humanId ? "user" : "assistant",
    content: String(m.content ?? ""),
  }));
  const map1 = process.hrtime.bigint();
  P.mark("fetch_rag_slice_done", {
    agentType,
    count: out.length,
    ms_inner: Number(map1 - map0) / 1_000_000,
  });
  return out;
}

// -----------------------------
// Route
// -----------------------------
router.get("/__ping", (_req, res) => res.json({ ok: true, scope: "chat" }));

router.post("/:humanId", async (req, res) => {
  const P = new Profiler();
  try {
    const humanId = String(req.params.humanId);
    const text = String(req.body?.text ?? "").trim();
    if (!text) return res.status(400).json({ error: "text required" });

    // Validate human
    await assertHuman(humanId);
    P.mark("assert_human_ok");

    // 1) Save user message immediately
    const ins0 = await supa
      .from("message")
      .insert({ sender_id: humanId, receiver_id: AI_ID, content: text })
      .select("message_id")
      .single();
    if (ins0.error) throw ins0.error;
    P.mark("save_user_msg");

    // 2) Kick off in parallel: classification + base context
    const userClassifyP = classifyWithRetry(text, P, "user");
    const baseCtxP = fetchBaseContext(humanId, P);

    // Cheap hint while classification runs
    const programHint = looksLikeProgramAsk(text);

    const [userImp, baseCtx] = await Promise.all([userClassifyP, baseCtxP]);
    P.mark("after_user_classify_and_basectx", {
      agent_type: userImp.agent_type,
    });

    // Early, non-blocking user-row update
    void supa
      .from("message")
      .update({
        is_important: userImp.important,
        agent_type: userImp.agent_type,
      })
      .eq("message_id", ins0.data!.message_id)
      .then(({ error }) =>
        error
          ? P.mark("user_update_error", { error: error.message })
          : P.mark("user_update_ok")
      );

    // 3) RAG-lite slice using agent_type
    const ragSlice = await fetchRagSlice(
      humanId,
      userImp.agent_type,
      baseCtx.oldestTs,
      baseCtx.ids,
      P
    );

    const ctx: ChatMessage[] = [...ragSlice, ...baseCtx.messages];
    P.mark("ctx_ready", { total_msgs: ctx.length });

    // 4) Dynamic system prompt
    const b0 = process.hrtime.bigint();
    let systemPrompt =
      "You are a fitness & wellbeing companion. Keep replies practical and concise.\n" +
      "If the user expresses urgency (today/tomorrow/ASAP/deadlines), provide step-by-step, time-sensitive actions.\n";

    if (programHint || userImp.agent_type.toLowerCase() === "training") {
      systemPrompt +=
        "\nWhen the user asks for a program/plan, output a structured plan with:\n" +
        "- Duration (weeks) and weekly schedule (days)\n" +
        "- Exercises with sets×reps (or time), rest, and progression guidance\n" +
        "- Variations for limited equipment if requested\n" +
        "- Safety/form notes\n" +
        "Prefer clear lists over paragraphs.\n";
    }
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...ctx,
    ];
    const b1 = process.hrtime.bigint();
    P.mark("build_prompt", {
      total_msgs: messages.length,
      ms_inner: Number(b1 - b0) / 1_000_000,
    });

    // 5) Model call
    const o0 = process.hrtime.bigint();
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 1000,
      messages,
    });
    const o1 = process.hrtime.bigint();
    P.mark("openai_complete", { ms_inner: Number(o1 - o0) / 1_000_000 });

    const reply =
      resp.choices?.[0]?.message?.content?.trim() ||
      "Sorry, I had trouble replying.";

    // 6) Insert AI reply row (sync)
    const ins1 = await supa
      .from("message")
      .insert({
        sender_id: AI_ID,
        receiver_id: humanId,
        content: reply,
      })
      .select("message_id")
      .single();
    if (ins1.error) throw ins1.error;
    P.mark("insert_ai_msg");

    // 7) Respond immediately (faster perceived latency)
    const profile = P.report();
    if (process.env.CHAT_PROFILING === "1") {
      attachTimingHeaders(res, profile);
      console.log(JSON.stringify({ reqId: P.id, profile }, null, 2));
    }

    res.json({
      reply,
      meta: {
        userImportance: userImp,
        // aiImportance is backfilled post-response
        ...(process.env.CHAT_PROFILING === "1" ? { profile } : {}),
      },
    });

    // 8) Post-response: classify AI reply & patch AI row (fire-and-forget)
    void (async () => {
      try {
        const aiImp = await classifyWithRetry(reply, P, "ai");
        const upd1 = await supa
          .from("message")
          .update({
            is_important: aiImp.important,
            agent_type: aiImp.agent_type,
          })
          .eq("message_id", ins1.data!.message_id);
        if (upd1.error)
          P.mark("update_ai_msg_error", { error: upd1.error.message });
        else P.mark("update_ai_msg_ok");
      } catch (e: any) {
        P.mark("post_response_pipeline_error", { error: e?.message });
      }
    })();
  } catch (err: any) {
    const profile = P.report();
    console.error(
      JSON.stringify({ reqId: P.id, error: err?.message, profile }, null, 2)
    );
    res.status(500).json({ error: err?.message || "unknown error" });
  }
});

export default router;
