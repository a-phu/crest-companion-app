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
// import { Router, type Response } from "express";
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
// // Helpers
// // -----------------------------
// function looksLikeProgramAsk(s: string): boolean {
//   const t = (s || "").toLowerCase();
//   return (
//     /\b(program|plan|routine|split|template|schedule)\b/.test(t) ||
//     /\bweek\s*\d\b/.test(t) ||
//     /\b\d+\s*week\b/.test(t)
//   );
// }

// function attachTimingHeaders(res: Response, profile: Array<{ step: string; ms: number }>) {
//   try {
//     const total = profile.find((p) => p.step === "TOTAL")?.ms ?? 0;
//     const serverTiming = profile
//       .filter((p) => p.step !== "TOTAL")
//       .map((p) => `${p.step.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60)};dur=${p.ms.toFixed(1)}`)
//       .join(", ");
//     if (serverTiming) res.setHeader("Server-Timing", serverTiming);
//     res.setHeader("X-Chat-Total-MS", String(total.toFixed(1)));
//   } catch {
//     /* noop */
//   }
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
//   // recent 12 (desc -> asc)
//   const q0 = process.hrtime.bigint();
//   const recentQ = await supa
//     .from("message")
//     .select("message_id,sender_id,receiver_id,content,is_important,created_at,agent_type")
//     .or(
//       `and(sender_id.eq.${humanId},receiver_id.eq.${AI_ID}),` +
//         `and(sender_id.eq.${AI_ID},receiver_id.eq.${humanId})`
//     )
//     .order("created_at", { ascending: false })
//     .limit(12);
//   const q1 = process.hrtime.bigint();
//   if (recentQ.error) throw recentQ.error;
//   P.mark("fetch_recent_done", { ms_inner: Number(q1 - q0) / 1_000_000, count: (recentQ.data ?? []).length });

//   const recent: MessageRow[] = (recentQ.data ?? []) as MessageRow[];
//   recent.reverse();

//   const ids = new Set(recent.map((m) => m.message_id));
//   const oldestTs = recent[0]?.created_at ?? new Date().toISOString();

//   // boosters: earlier important within 90d
//   const since90 = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
//   const q2 = process.hrtime.bigint();
//   const impQ = await supa
//     .from("message")
//     .select("message_id,sender_id,receiver_id,content,is_important,created_at,agent_type")
//     .or(
//       `and(sender_id.eq.${humanId},receiver_id.eq.${AI_ID}),` +
//         `and(sender_id.eq.${AI_ID},receiver_id.eq.${humanId})`
//     )
//     .eq("is_important", true)
//     .lt("created_at", oldestTs)
//     .gte("created_at", since90)
//     .order("created_at", { ascending: false })
//     .limit(10);
//   const q3 = process.hrtime.bigint();
//   if (impQ.error) throw impQ.error;
//   P.mark("fetch_boosters_done", { ms_inner: Number(q3 - q2) / 1_000_000, total_considered: (impQ.data ?? []).length });

//   const boosters: MessageRow[] = [];
//   for (const m of (impQ.data ?? []) as MessageRow[]) {
//     if (!ids.has(m.message_id)) boosters.push(m);
//     if (boosters.length >= 3) break;
//   }
//   boosters.reverse();

//   const rows = [...boosters, ...recent];

//   const m0 = process.hrtime.bigint();
//   const messages: ChatMessage[] = rows.map((m) => ({
//     role: m.sender_id === humanId ? "user" : "assistant",
//     content: String(m.content ?? ""),
//   }));
//   const m1 = process.hrtime.bigint();
//   P.mark("map_rows_to_messages", { ms_inner: Number(m1 - m0) / 1_000_000, rows: rows.length });

//   P.mark("fetch_base_ctx_done", {
//     recent: recent.length,
//     boosters: boosters.length,
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

//   const r0 = process.hrtime.bigint();
//   const ragQ = await supa
//     .from("message")
//     .select("message_id,sender_id,receiver_id,content,is_important,created_at,agent_type")
//     .or(
//       `and(sender_id.eq.${humanId},receiver_id.eq.${AI_ID}),` +
//         `and(sender_id.eq.${AI_ID},receiver_id.eq.${humanId})`
//     )
//     .eq("agent_type", agentType)
//     .lt("created_at", oldestTs)
//     .order("created_at", { ascending: false })
//     .limit(8);
//   const r1 = process.hrtime.bigint();
//   if (ragQ.error) throw ragQ.error;
//   P.mark("fetch_rag_query_done", { ms_inner: Number(r1 - r0) / 1_000_000, raw: (ragQ.data ?? []).length });

//   let ragRows: MessageRow[] = ((ragQ.data ?? []) as MessageRow[]).filter(
//     (m) => !blockIds.has(m.message_id)
//   );

//   ragRows.sort(
//     (a: MessageRow, b: MessageRow) =>
//       new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
//   );
//   if (ragRows.length > 4) ragRows = ragRows.slice(-4);

//   const map0 = process.hrtime.bigint();
//   const out = ragRows.map<ChatMessage>((m) => ({
//     role: m.sender_id === humanId ? "user" : "assistant",
//     content: String(m.content ?? ""),
//   }));
//   const map1 = process.hrtime.bigint();
//   P.mark("fetch_rag_slice_done", {
//     agentType,
//     count: out.length,
//     ms_inner: Number(map1 - map0) / 1_000_000,
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

//     // Early, non-blocking user-row update
//     void supa
//       .from("message")
//       .update({
//         is_important: userImp.important,
//         agent_type: userImp.agent_type,
//       })
//       .eq("message_id", ins0.data!.message_id)
//       .then(({ error }) =>
//         error ? P.mark("user_update_error", { error: error.message }) : P.mark("user_update_ok")
//       );

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
//     const b0 = process.hrtime.bigint();
//     let systemPrompt =
//       "You are a fitness & wellbeing companion. Keep replies practical and concise.\n" +
//       "If the user expresses urgency (today/tomorrow/ASAP/deadlines), provide step-by-step, time-sensitive actions.\n";

//     if (programHint || userImp.agent_type.toLowerCase() === "training") {
//       systemPrompt +=
//         "\nWhen the user asks for a program/plan, output a structured plan with:\n" +
//         "- Duration (weeks) and weekly schedule (days)\n" +
//         "- Exercises with sets×reps (or time), rest, and progression guidance\n" +
//         "- Variations for limited equipment if requested\n" +
//         "- Safety/form notes\n" +
//         "Prefer clear lists over paragraphs.\n";
//     }
//     const messages: ChatMessage[] = [{ role: "system", content: systemPrompt }, ...ctx];
//     const b1 = process.hrtime.bigint();
//     P.mark("build_prompt", { total_msgs: messages.length, ms_inner: Number(b1 - b0) / 1_000_000 });

//     // 5) Model call
//     const o0 = process.hrtime.bigint();
//     const resp = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       temperature: 0.3,
//       max_tokens: Math.min(350, Number(req.body?.max_tokens ?? 350)),
//       messages,
//     });
//     const o1 = process.hrtime.bigint();
//     P.mark("openai_complete", { ms_inner: Number(o1 - o0) / 1_000_000 });

//     const reply =
//       resp.choices?.[0]?.message?.content?.trim() || "Sorry, I had trouble replying.";

//     // 6) Insert AI reply row (sync)
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

//     // 7) Respond immediately (faster perceived latency)
//     const profile = P.report();
//     if (process.env.CHAT_PROFILING === "1") {
//       attachTimingHeaders(res, profile);
//       console.log(JSON.stringify({ reqId: P.id, profile }, null, 2));
//     }

//     res.json({
//       reply,
//       meta: {
//         userImportance: userImp,
//         // aiImportance is backfilled post-response
//         ...(process.env.CHAT_PROFILING === "1" ? { profile } : {}),
//       },
//     });

//     // 8) Post-response: classify AI reply & patch AI row (fire-and-forget)
//     void (async () => {
//       try {
//         const aiImp = await classifyWithRetry(reply, P, "ai");
//         const upd1 = await supa
//           .from("message")
//           .update({
//             is_important: aiImp.important,
//             agent_type: aiImp.agent_type,
//           })
//           .eq("message_id", ins1.data!.message_id);
//         if (upd1.error) P.mark("update_ai_msg_error", { error: upd1.error.message });
//         else P.mark("update_ai_msg_ok");
//       } catch (e: any) {
//         P.mark("post_response_pipeline_error", { error: e?.message });
//       }
//     })();
//   } catch (err: any) {
//     const profile = P.report();
//     console.error(JSON.stringify({ reqId: P.id, error: err?.message, profile }, null, 2));
//     res.status(500).json({ error: err?.message || "unknown error" });
//   }
// });

// export default router;
// backend/src/routes/chat.ts
// import { Router, type Response } from "express";
// import { supa } from "../supabase";
// import { openai } from "../OpenaiClient";
// import { AI_ID } from "../id";
// import { classifyImportance, type ImportanceResult } from "../importance";
// import { Profiler } from "../profiler";
// import { BASE_SYSTEM_PROMPT, TRAINING_PROGRAM_GUIDE, PROGRAM_INTENT_PROMPT } from "../prompts";
// import {
//   AgentType,
//   agentToProgramType,
//   isProgramCapable,
//   normalizeAgentType,
// } from "../agents";

// // -----------------------------
// // Types
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

// const router = Router();

// const UUID_RE =
//   /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// // -----------------------------
// // Helpers
// // -----------------------------
// function attachTimingHeaders(res: Response, profile: Array<{ step: string; ms: number }>) {
//   try {
//     const total = profile.find((p) => p.step === "TOTAL")?.ms ?? 0;
//     const serverTiming = profile
//       .filter((p) => p.step !== "TOTAL")
//       .map((p) => `${p.step.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60)};dur=${p.ms.toFixed(1)}`)
//       .join(", ");
//     if (serverTiming) res.setHeader("Server-Timing", serverTiming);
//     res.setHeader("X-Chat-Total-MS", String(total.toFixed(1)));
//   } catch {
//     /* noop */
//   }
// }

// async function classifyWithRetry(
//   text: string,
//   P: Profiler,
//   label: "user" | "ai"
// ): Promise<ImportanceResult> {
//   const fallback: ImportanceResult = {
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
//   if (!UUID_RE.test(humanId)) throw new Error("invalid humanId (not a UUID)");
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

// // --- AI: detect program intent (strict JSON, uses AgentType) ---
// async function detectProgramIntent(
//   text: string,
//   P: Profiler
// ): Promise<{
//   should_create: boolean;
//   confidence: number;
//   agent_type: AgentType; // canonical
//   parsed?: {
//     start_date?: string | null;
//     duration_weeks?: number | null;
//     days_per_week?: number | null;
//     modalities?: string[] | null;
//   };
// }> {
//   const u = (text ?? "").slice(0, 2000);
//   const t0 = process.hrtime.bigint();
//   const completion = await openai.chat.completions.create({
//     model: "gpt-4o-mini",
//     response_format: { type: "json_object" },
//     temperature: 0,
//     messages: [
//       { role: "system", content: PROGRAM_INTENT_PROMPT },
//       { role: "user", content: u },
//     ],
//   });
//   const t1 = process.hrtime.bigint();
//   P.mark("intent_detect_done", { ms_inner: Number(t1 - t0) / 1_000_000 });

//   let parsed: any = {};
//   try {
//     parsed = JSON.parse(completion.choices?.[0]?.message?.content ?? "{}");
//   } catch {
//     parsed = {};
//   }

//   return {
//     should_create: !!parsed?.should_create,
//     confidence: Math.max(0, Math.min(1, Number(parsed?.confidence || 0))),
//     agent_type: normalizeAgentType(parsed?.agent_type), // <- normalize to canonical set
//     parsed: parsed?.parsed || {},
//   };
// }

// // ---- Auto-create program from a chat message (index-based days) ----
// async function maybeCreateProgramFromMessage(
//   userId: string,
//   text: string,
//   agent: AgentType, // "Training" | "Nutrition" | "Sleep" | ...
//   opts?: { start_date?: string | null; duration_weeks?: number | null }
// ) {
//   if (!isProgramCapable(agent)) return null;

//   const internalType = agentToProgramType(agent, "v1");

//   // Optional debounce: skip if a very recent active/scheduled program of same type exists
//   const recent = await supa
//     .from("program")
//     .select("program_id, created_at, type, status")
//     .eq("user_id", userId)
//     .eq("type", internalType)
//     .in("status", ["active", "scheduled"])
//     .order("created_at", { ascending: false })
//     .limit(1);

//   if (!recent.error && recent.data?.length) {
//     const last = recent.data[0];
//     const createdMs = new Date(last.created_at).getTime();
//     if (Date.now() - createdMs < 120_000) {
//       return last.program_id as string;
//     }
//   }

//   // Start date: AI override → today fallback
//   const start = opts?.start_date ? new Date(opts.start_date) : new Date();
//   const startISO = start.toISOString().slice(0, 10);

//   // Duration: AI override → default 2 weeks (cap 12)
//   const period_length_weeks = Math.max(1, Math.min(12, Math.floor(opts?.duration_weeks ?? 2)));
//   const end = new Date(start);
//   end.setDate(end.getDate() + period_length_weeks * 7 - 1);
//   const endISO = end.toISOString().slice(0, 10);

//   // 1) Insert Program
//   const { data: prog, error: progErr } = await supa
//     .from("program")
//     .insert({
//       user_id: userId,
//       type: internalType,
//       status: "active",
//       start_date: startISO,
//       end_date: endISO,
//       period_length_weeks,
//       spec_json: { source: "chat", raw_request: text },
//     })
//     .select("program_id")
//     .single();
//   if (progErr) throw progErr;

//   // 2) Insert Period with index-based days (simple seed content)
//   const days = Array.from({ length: period_length_weeks * 7 }, (_, i) => {
//     if (agent === "Training") {
//       return {
//         notes: `Day ${i + 1}`,
//         blocks: [
//           { kind: "exercise", name: "Bench Press", sets: 4, reps: "6–8", rest_sec: 150 },
//           { kind: "exercise", name: "Row", sets: 4, reps: "8–12", rest_sec: 120 },
//         ],
//       };
//     }
//     if (agent === "Nutrition") {
//       return {
//         notes: `Day ${i + 1}`,
//         blocks: [
//           { kind: "meal", name: "High-protein breakfast", macros: { kcal: 450, p: 35, c: 40, f: 15 } },
//           { kind: "habit", title: "2L water goal" },
//         ],
//       };
//     }
//     if (agent === "Sleep") {
//       return {
//         notes: `Day ${i + 1}`,
//         blocks: [
//           { kind: "sleep_task", title: "Anchor wake time", time: "06:45" },
//           { kind: "habit", title: "No screens 60min pre-bed" },
//         ],
//       };
//     }
//     // other
//     return { notes: `Day ${i + 1}`, blocks: [] };
//   });

//   const { error: perErr } = await supa.from("program_period").insert({
//     program_id: prog.program_id,
//     period_index: 0,
//     start_date: startISO,
//     end_date: endISO,
//     period_json: { days },
//   });
//   if (perErr) throw perErr;

//   return prog.program_id as string;
// }

// // -----------------------------
// // Context builders
// // -----------------------------
// type BaseContext = {
//   rows: MessageRow[];
//   ids: Set<string>;
//   oldestTs: string;
//   messages: ChatMessage[];
// };

// async function fetchBaseContext(humanId: string, P: Profiler): Promise<BaseContext> {
//   const q0 = process.hrtime.bigint();
//   const recentQ = await supa
//     .from("message")
//     .select("message_id,sender_id,receiver_id,content,is_important,created_at,agent_type")
//     .or(
//       `and(sender_id.eq.${humanId},receiver_id.eq.${AI_ID}),` +
//         `and(sender_id.eq.${AI_ID},receiver_id.eq.${humanId})`
//     )
//     .order("created_at", { ascending: false })
//     .limit(12);
//   const q1 = process.hrtime.bigint();
//   if (recentQ.error) throw recentQ.error;
//   const recent: MessageRow[] = (recentQ.data ?? []) as MessageRow[];
//   recent.reverse();

//   const ids = new Set(recent.map((m) => m.message_id));
//   const oldestTs = recent[0]?.created_at ?? new Date().toISOString();

//   const since90 = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
//   const q2 = process.hrtime.bigint();
//   const impQ = await supa
//     .from("message")
//     .select("message_id,sender_id,receiver_id,content,is_important,created_at,agent_type")
//     .or(
//       `and(sender_id.eq.${humanId},receiver_id.eq.${AI_ID}),` +
//         `and(sender_id.eq.${AI_ID},receiver_id.eq.${humanId})`
//     )
//     .eq("is_important", true)
//     .lt("created_at", oldestTs)
//     .gte("created_at", since90)
//     .order("created_at", { ascending: false })
//     .limit(10);
//   const q3 = process.hrtime.bigint();
//   if (impQ.error) throw impQ.error;

//   const boosters: MessageRow[] = [];
//   for (const m of (impQ.data ?? []) as MessageRow[]) {
//     if (!ids.has(m.message_id)) boosters.push(m);
//     if (boosters.length >= 3) break;
//   }
//   boosters.reverse();

//   const rows = [...boosters, ...recent];

//   const m0 = process.hrtime.bigint();
//   const messages: ChatMessage[] = rows.map((m) => ({
//     role: m.sender_id === humanId ? "user" : "assistant",
//     content: String(m.content ?? ""),
//   }));
//   const m1 = process.hrtime.bigint();

//   P.mark("fetch_base_ctx_done", {
//     ms_recent: Number(q1 - q0) / 1_000_000,
//     ms_boosters: Number(q3 - q2) / 1_000_000,
//     ms_map: Number(m1 - m0) / 1_000_000,
//     recent: recent.length,
//     boosters: boosters.length,
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

//   const r0 = process.hrtime.bigint();
//   const ragQ = await supa
//     .from("message")
//     .select("message_id,sender_id,receiver_id,content,is_important,created_at,agent_type")
//     .or(
//       `and(sender_id.eq.${humanId},receiver_id.eq.${AI_ID}),` +
//         `and(sender_id.eq.${AI_ID},receiver_id.eq.${humanId})`
//     )
//     .eq("agent_type", agentType)
//     .lt("created_at", oldestTs)
//     .order("created_at", { ascending: false })
//     .limit(8);
//   const r1 = process.hrtime.bigint();
//   if (ragQ.error) throw ragQ.error;

//   let ragRows: MessageRow[] = ((ragQ.data ?? []) as MessageRow[]).filter(
//     (m) => !blockIds.has(m.message_id)
//   );

//   ragRows.sort(
//     (a: MessageRow, b: MessageRow) =>
//       new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
//   );
//   if (ragRows.length > 4) ragRows = ragRows.slice(-4);

//   const map0 = process.hrtime.bigint();
//   const out = ragRows.map<ChatMessage>((m) => ({
//     role: m.sender_id === humanId ? "user" : "assistant",
//     content: String(m.content ?? ""),
//   }));
//   const map1 = process.hrtime.bigint();
//   P.mark("fetch_rag_slice_done", {
//     agentType,
//     count: out.length,
//     ms_inner: Number(map1 - map0) / 1_000_000,
//   });
//   return out;
// }

// // -----------------------------
// // Routes
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

//     // 2) Run in parallel: user importance, base context, AI intent
//     const impP = classifyWithRetry(text, P, "user");
//     const ctxP = fetchBaseContext(humanId, P);
//     const intentP = detectProgramIntent(text, P);

//     const [userImp, baseCtx, intent] = await Promise.all([impP, ctxP, intentP]);
//     P.mark("after_user_cls_ctx_intent", { agent_type: userImp.agent_type, intent });

//     // Early, non-blocking user-row update
//     void supa
//       .from("message")
//       .update({ is_important: userImp.important, agent_type: userImp.agent_type })
//       .eq("message_id", ins0.data!.message_id)
//       .then(({ error }) =>
//         error ? P.mark("user_update_error", { error: error.message }) : P.mark("user_update_ok")
//       );

//     // 3) RAG-lite slice
//     const ragSlice = await fetchRagSlice(humanId, userImp.agent_type, baseCtx.oldestTs, baseCtx.ids, P);
//     const ctx: ChatMessage[] = [...ragSlice, ...baseCtx.messages];
//     P.mark("ctx_ready", { total_msgs: ctx.length });

//     // 4) AI-ONLY program creation (fire-and-forget)
//     if (intent.should_create && intent.confidence >= 0.75 && isProgramCapable(intent.agent_type)) {
//       const overrides = {
//         start_date: intent.parsed?.start_date ?? null,
//         duration_weeks: intent.parsed?.duration_weeks ?? null,
//       };
//       void maybeCreateProgramFromMessage(humanId, text, intent.agent_type, overrides)
//         .then((id) =>
//           P.mark("program_autocreate", { program_id: id || "skipped", conf: intent.confidence })
//         )
//         .catch((e) => P.mark("program_autocreate_err", { err: String(e?.message || e) }));
//     }

//     // 5) System prompt
//     const b0 = process.hrtime.bigint();
//     let systemPrompt = BASE_SYSTEM_PROMPT;
//     if (intent.should_create && intent.agent_type === "Training") {
//       systemPrompt += TRAINING_PROGRAM_GUIDE;
//     }
//     const messages: ChatMessage[] = [{ role: "system", content: systemPrompt }, ...ctx];
//     const b1 = process.hrtime.bigint();
//     P.mark("build_prompt", { total_msgs: messages.length, ms_inner: Number(b1 - b0) / 1_000_000 });

//     // 6) Model call
//     const o0 = process.hrtime.bigint();
//     const resp = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       temperature: 0.3,
//       max_tokens: Math.min(350, Number(req.body?.max_tokens ?? 350)),
//       messages,
//     });
//     const o1 = process.hrtime.bigint();
//     P.mark("openai_complete", { ms_inner: Number(o1 - o0) / 1_000_000 });

//     const reply = resp.choices?.[0]?.message?.content?.trim() || "Sorry, I had trouble replying.";

//     // 7) Insert AI reply
//     const ins1 = await supa
//       .from("message")
//       .insert({ sender_id: AI_ID, receiver_id: humanId, content: reply })
//       .select("message_id")
//       .single();
//     if (ins1.error) throw ins1.error;
//     P.mark("insert_ai_msg");

//     // 8) Respond (fast)
//     const profile = P.report();
//     if (process.env.CHAT_PROFILING === "1") {
//       attachTimingHeaders(res, profile);
//       console.log(JSON.stringify({ reqId: P.id, profile }, null, 2));
//     }

//     res.json({
//       reply,
//       meta: {
//         userImportance: userImp,
//         ...(process.env.CHAT_PROFILING === "1" ? { profile } : {}),
//       },
//     });

//     // 9) Post-response: classify AI reply & patch AI row (background)
//     void (async () => {
//       try {
//         const aiImp = await classifyWithRetry(reply, P, "ai");
//         const upd1 = await supa
//           .from("message")
//           .update({ is_important: aiImp.important, agent_type: aiImp.agent_type })
//           .eq("message_id", ins1.data!.message_id);
//         if (upd1.error) P.mark("update_ai_msg_error", { error: upd1.error.message });
//         else P.mark("update_ai_msg_ok");
//       } catch (e: any) {
//         P.mark("post_response_pipeline_error", { error: e?.message });
//       }
//     })();
//   } catch (err: any) {
//     const profile = P.report();
//     console.error(JSON.stringify({ reqId: P.id, error: err?.message, profile }, null, 2));
//     res.status(500).json({ error: err?.message || "unknown error" });
//   }
// });

// export default router;
// backend/src/routes/chat.ts
// backend/src/routes/chat.ts
/// backend/src/routes/chat.ts
import { Router, type Response } from "express";
import { supa } from "../supabase";
import { openai } from "../OpenaiClient";
import { AI_ID } from "../id";
import { classifyImportance, type ImportanceResult } from "../importance";
import { Profiler } from "../profiler";
import { BASE_SYSTEM_PROMPT, TRAINING_PROGRAM_GUIDE, PROGRAM_INTENT_PROMPT } from "../prompts";
import { AgentType, agentToProgramType, isProgramCapable } from "../agents";
import { buildProgramDaysNoKinds } from "../programdays";

// Helper function to trigger insights generation
async function triggerInsightsGeneration(userId: string, P: Profiler) {
  try {
    P.mark("insights_trigger_start");
    const response = await fetch('http://localhost:8080/api/insights/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      P.mark("insights_trigger_success");
    } else {
      P.mark("insights_trigger_failed", { status: response.status });
    }
  } catch (error: any) {
    P.mark("insights_trigger_error", { error: error.message });
    console.log('Failed to trigger insights generation:', error.message);
  }
}

// -----------------------------
// Types
// -----------------------------
type MessageRow = {
  message_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_important?: boolean | null;
  created_at: string; // ISO
  agent_type?: string | null; // canonical AgentType string or "other"
};

type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string };

// Intent payload from the model
type IntentParsed = {
  start_date?: string | null;     // YYYY-MM-DD (optional)
  duration_weeks?: number | null; // optional
  days_per_week?: number | null;  // optional
  modalities?: string[] | null;   // optional (e.g., ["BJJ","Muay Thai"])
};

type IntentResult = {
  should_create: boolean;
  confidence: number;     // 0..1
  agent: AgentType;       // canonical agent string
  parsed?: IntentParsed;
};

const router = Router();

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// -----------------------------
// Helpers
// -----------------------------
function attachTimingHeaders(res: Response, profile: Array<{ step: string; ms: number }>) {
  try {
    const total = profile.find((p) => p.step === "TOTAL")?.ms ?? 0;
    const serverTiming = profile
      .filter((p) => p.step !== "TOTAL")
      .map((p) => `${p.step.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60)};dur=${p.ms.toFixed(1)}`)
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
): Promise<ImportanceResult> {
  const fallback: ImportanceResult = {
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
      P.mark(`classify_${label}_done_retry`, { ms_inner: Number(t1 - t0) / 1_000_000 });
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

// Normalize a free-form intent value to your canonical AgentType
function normalizeAgentFromIntent(v: unknown): AgentType {
  const t = String(v || "").toLowerCase();
  if (t === "training") return "Training";
  if (t === "nutrition") return "Nutrition";
  if (t === "sleep") return "Sleep";
  if (t === "mind") return "Mind";
  if (t === "body") return "Body";
  if (t === "clinical") return "Clinical";
  if (t === "cognition") return "Cognition";
  if (t === "identity") return "Identity";
  return "other";
}

// --- AI: detect program intent (STRICT JSON; agent-only worldview) ---
async function detectProgramIntent(text: string, P: Profiler): Promise<IntentResult> {
  const u = (text ?? "").slice(0, 2000);
  const t0 = process.hrtime.bigint();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0,
    messages: [
      { role: "system", content: PROGRAM_INTENT_PROMPT },
      { role: "user", content: u },
    ],
  });
  const t1 = process.hrtime.bigint();
  P.mark("intent_detect_done", { ms_inner: Number(t1 - t0) / 1_000_000 });

  let parsed: any = {};
  try {
    parsed = JSON.parse(completion.choices?.[0]?.message?.content ?? "{}");
  } catch {
    parsed = {};
  }

  return {
    should_create: !!parsed?.should_create,
    confidence: Math.max(0, Math.min(1, Number(parsed?.confidence || 0))),
    agent: normalizeAgentFromIntent(parsed?.program_type),
    parsed: parsed?.parsed || {},
  };
}

// ---- Create a program using AGENT TYPE (no kinds) & LLM-generated days ----
async function createProgramFromIntent(
  userId: string,
  rawRequest: string,
  agent: AgentType,
  parsed?: IntentParsed,
  P?: Profiler
): Promise<string | null> {
  if (!isProgramCapable(agent)) return null;

  // Debounce: skip if a very recent active/scheduled program of same internal type exists
  const internalType = agentToProgramType(agent, "v1"); // e.g., "training.v1"
  const recent = await supa
    .from("program")
    .select("program_id, created_at, type, status")
    .eq("user_id", userId)
    .eq("type", internalType)
    .in("status", ["active", "scheduled"])
    .order("created_at", { ascending: false })
    .limit(1);
  if (!recent.error && recent.data?.length) {
    const last = recent.data[0];
    const createdMs = new Date(last.created_at).getTime();
    if (Date.now() - createdMs < 120_000) {
      return last.program_id as string;
    }
  }

  // Dates
  const start = parsed?.start_date ? new Date(parsed.start_date) : new Date();
  const startISO = start.toISOString().slice(0, 10);
  const weeks = Math.max(1, Math.min(12, Math.floor(parsed?.duration_weeks ?? 2)));
  const end = new Date(start);
  end.setDate(end.getDate() + weeks * 7 - 1);
  const endISO = end.toISOString().slice(0, 10);

  // Insert program shell
  const { data: prog, error: progErr } = await supa
    .from("program")
    .insert({
      user_id: userId,
      type: internalType,
      status: "active",
      start_date: startISO,
      end_date: endISO,
      period_length_weeks: weeks,
      spec_json: { source: "chat", raw_request: rawRequest },
    })
    .select("program_id")
    .single();
  if (progErr) throw progErr;

  // Build days via LLM (no "kind"); size = weeks*7
  const days = await buildProgramDaysNoKinds(
    {
      agent,
      weeks,
      hints: {
        days_per_week: parsed?.days_per_week ?? null,
        modalities: parsed?.modalities ?? null,
      },
    },
    P
  );

  // Save period
  const { error: perErr } = await supa.from("program_period").insert({
    program_id: prog.program_id,
    period_index: 0,
    start_date: startISO,
    end_date: endISO,
    period_json: { days },
  });
  if (perErr) throw perErr;

  return prog.program_id as string;
}

// -----------------------------
// Context builders
// -----------------------------
type BaseContext = {
  rows: MessageRow[];
  ids: Set<string>;
  oldestTs: string;
  messages: ChatMessage[];
};

async function fetchBaseContext(humanId: string, P: Profiler): Promise<BaseContext> {
  const q0 = process.hrtime.bigint();
  const recentQ = await supa
    .from("message")
    .select("message_id,sender_id,receiver_id,content,is_important,created_at,agent_type")
    .or(
      `and(sender_id.eq.${humanId},receiver_id.eq.${AI_ID}),` +
        `and(sender_id.eq.${AI_ID},receiver_id.eq.${humanId})`
    )
    .order("created_at", { ascending: false })
    .limit(12);
  const q1 = process.hrtime.bigint();
  if (recentQ.error) throw recentQ.error;
  const recent: MessageRow[] = (recentQ.data ?? []) as MessageRow[];
  recent.reverse();

  const ids = new Set(recent.map((m) => m.message_id));
  const oldestTs = recent[0]?.created_at ?? new Date().toISOString();

  // boosters: earlier important within 90d
  const since90 = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
  const q2 = process.hrtime.bigint();
  const impQ = await supa
    .from("message")
    .select("message_id,sender_id,receiver_id,content,is_important,created_at,agent_type")
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

  P.mark("fetch_base_ctx_done", {
    ms_recent: Number(q1 - q0) / 1_000_000,
    ms_boosters: Number(q3 - q2) / 1_000_000,
    ms_map: Number(m1 - m0) / 1_000_000,
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
    .select("message_id,sender_id,receiver_id,content,is_important,created_at,agent_type")
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
// Routes
// -----------------------------
router.get("/__ping", (_req, res) => res.json({ ok: true, scope: "chat" }));

router.post("/:humanId", async (req, res) => {
  const P = new Profiler();
  try {
    const humanId = String(req.params.humanId);
    const text = String(req.body?.text ?? "").trim();
    if (!text) return res.status(400).json({ error: "text required" });

    // Validate human (commented out for development)
    // await assertHuman(humanId);
    P.mark("assert_human_ok");

    // 1) Save user message immediately
    const ins0 = await supa
      .from("message")
      .insert({ sender_id: humanId, receiver_id: AI_ID, content: text })
      .select("message_id")
      .single();
    if (ins0.error) throw ins0.error;
    P.mark("save_user_msg");

    // 2) Run in parallel: user importance, base context, AI intent
    const impP = classifyWithRetry(text, P, "user");
    const ctxP = fetchBaseContext(humanId, P);
    const intentP = detectProgramIntent(text, P);

    const [userImp, baseCtx, intent] = await Promise.all([impP, ctxP, intentP]);
    P.mark("after_user_cls_ctx_intent", { agent_type: userImp.agent_type, intent });

    // Early, non-blocking user-row update
    void supa
      .from("message")
      .update({ is_important: userImp.important, agent_type: userImp.agent_type })
      .eq("message_id", ins0.data!.message_id)
      .then(({ error }) =>
        error ? P.mark("user_update_error", { error: error.message }) : P.mark("user_update_ok")
      );

    // 3) RAG-lite slice
    const ragSlice = await fetchRagSlice(humanId, userImp.agent_type, baseCtx.oldestTs, baseCtx.ids, P);
    const ctx: ChatMessage[] = [...ragSlice, ...baseCtx.messages];
    P.mark("ctx_ready", { total_msgs: ctx.length });

    // 4) AI-ONLY program creation (fire-and-forget) tied to AgentType
    // Prefer the intent's agent, but fall back to the classifier if intent isn't program-capable.
    const inferredAgent: AgentType =
      isProgramCapable(intent.agent) ? intent.agent
      : isProgramCapable(userImp.agent_type as AgentType) ? (userImp.agent_type as AgentType)
      : "other";

    if (intent.should_create && intent.confidence >= 0.6 && isProgramCapable(inferredAgent)) {
      void createProgramFromIntent(humanId, text, inferredAgent, intent.parsed, P)
        .then((id) => P.mark("program_create", { program_id: id || "skipped", conf: intent.confidence }))
        .catch((e) => P.mark("program_create_err", { err: String(e?.message || e) }));
    }

    // 5) System prompt (optionally include training guide if relevant)
    const b0 = process.hrtime.bigint();
    let systemPrompt = BASE_SYSTEM_PROMPT;
    if ((intent.should_create && inferredAgent === "Training") || userImp.agent_type === "Training") {
      systemPrompt += TRAINING_PROGRAM_GUIDE;
    }
    const messages: ChatMessage[] = [{ role: "system", content: systemPrompt }, ...ctx];
    const b1 = process.hrtime.bigint();
    P.mark("build_prompt", { total_msgs: messages.length, ms_inner: Number(b1 - b0) / 1_000_000 });

    // 6) Model call for the assistant reply
    const o0 = process.hrtime.bigint();
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 1000,
      messages,
    });
    const o1 = process.hrtime.bigint();
    P.mark("openai_complete", { ms_inner: Number(o1 - o0) / 1_000_000 });

    const reply = resp.choices?.[0]?.message?.content?.trim() || "Sorry, I had trouble replying.";

    // 7) Insert AI reply
    const ins1 = await supa
      .from("message")
      .insert({ sender_id: AI_ID, receiver_id: humanId, content: reply })
      .select("message_id")
      .single();
    if (ins1.error) throw ins1.error;
    P.mark("insert_ai_msg");

    // 8) Respond (fast)
    const profile = P.report();
    if (process.env.CHAT_PROFILING === "1") {
      attachTimingHeaders(res, profile);
      console.log(JSON.stringify({ reqId: P.id, profile }, null, 2));
    }

    res.json({
      reply,
      meta: {
        userImportance: userImp,
        ...(process.env.CHAT_PROFILING === "1" ? { profile } : {}),
      },
    });

    // 9) Post-response: classify AI reply & patch AI row (background)
    void (async () => {
      try {
        const aiImp = await classifyWithRetry(reply, P, "ai");
        const upd1 = await supa
          .from("message")
          .update({ is_important: aiImp.important, agent_type: aiImp.agent_type })
          .eq("message_id", ins1.data!.message_id);
        if (upd1.error) P.mark("update_ai_msg_error", { error: upd1.error.message });
        else P.mark("update_ai_msg_ok");
        
        // Trigger insights generation if AI message is important
        if (aiImp.important) {
          void triggerInsightsGeneration(humanId, P);
        }
      } catch (e: any) {
        P.mark("post_response_pipeline_error", { error: e?.message });
      }
    })();
  } catch (err: any) {
    const profile = P.report();
    console.error(JSON.stringify({ reqId: P.id, error: err?.message, profile }, null, 2));
    res.status(500).json({ error: err?.message || "unknown error" });
  }
});

export default router;
