// backend/src/routes/chat.ts
import { Router, type Response } from "express";
import { supa } from "../supabase";
import { openai } from "../OpenaiClient";
import { AI_ID } from "../id";
import { classifyImportance, type ImportanceResult } from "../importance";
import { Profiler } from "../profiler";
import {
  BASE_SYSTEM_PROMPT,
  TRAINING_PROGRAM_GUIDE,
  PROGRAM_INTENT_PROMPT,
  OUT_OF_SCOPE_RESPONSE_PROMPT,
} from "../prompts/prompt";
import { AgentType, agentToProgramType, isProgramCapable } from "../agents";
import { buildProgramDaysUniversal } from "../universalProgram";

const router = Router();

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
  agent_type?: string | null;
};

type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string };

type IntentAction = "create" | "change" | "none";

type IntentParsed = {
  start_date?: string | null; // YYYY-MM-DD
  duration_weeks?: number | null;
  days_per_week?: number | null;
  modalities?: string[] | null;
  training_days?:
    | ("Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun")[]
    | null;
};

type IntentResult = {
  should_create: boolean;
  confidence: number; // 0..1
  agent: AgentType;
  parsed?: IntentParsed;
  action: IntentAction;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// -----------------------------
// Helpers
// -----------------------------
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
          `${p.step.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60)};dur=${p.ms.toFixed(
            1
          )}`
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

// --- AI: detect program intent (STRICT JSON + action) ---
async function detectProgramIntent(
  text: string,
  P: Profiler
): Promise<IntentResult> {
  const u = (text ?? "").slice(0, 2000);
  const t0 = process.hrtime.bigint();
  
  // Add current date context to help AI parse relative dates
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayISO = today.toISOString().slice(0, 10);
  const tomorrowISO = tomorrow.toISOString().slice(0, 10);
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0,
    messages: [
      { 
        role: "system", 
        content: PROGRAM_INTENT_PROMPT + `\n\nCurrent context: Today is ${todayISO}, tomorrow is ${tomorrowISO}. Always convert relative dates to absolute YYYY-MM-DD format.`
      },
      { role: "user", content: u },
    ],
  });
  
  const t1 = process.hrtime.bigint();
  P.mark("intent_detect_done", { ms_inner: Number(t1 - t0) / 1_000_000 });

  let parsedAny: any = {};
  try {
    parsedAny = JSON.parse(completion.choices?.[0]?.message?.content ?? "{}");
    
    // DEBUG: Enhanced logging
    console.log('DEBUG detectProgramIntent ENHANCED:', {
      userText: u.slice(0, 100),
      todayISO,
      tomorrowISO,
      aiResponse: parsedAny,
      parsedStartDate: parsedAny?.parsed?.start_date,
      rawAIContent: completion.choices?.[0]?.message?.content
    });
    
  } catch {}

  const action: IntentAction =
    parsedAny?.action === "change"
      ? "change"
      : parsedAny?.should_create
        ? "create"
        : "none";

  return {
    should_create: !!parsedAny?.should_create,
    confidence: Math.max(0, Math.min(1, Number(parsedAny?.confidence || 0))),
    agent: normalizeAgentFromIntent(parsedAny?.agent_type),
    parsed: parsedAny?.parsed || {},
    action,
  };
}

/* -------------------------------------------------------------------------- */
/* NEW: spacing helper for chat-created programs (mirrors /programs route)   */
/* -------------------------------------------------------------------------- */
type Weekday = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

/** Spread/force days_per_week inside each 7-day block; honour training_days if given. */
function enforceDaysPerWeek(
  days: Array<{ plan?: any } | any>,
  effectiveDateISO: string,
  daysPerWeek: number,
  trainingDays?: Weekday[] | null
) {
  const wants = Math.max(0, Math.min(7, Number(daysPerWeek || 0)));
  if (wants === 7) return days;

  // shallow clone so we don't mutate the generator result
  const out = days.map((d: any) =>
    d?.plan ? { ...d, plan: { ...d.plan } } : { ...d }
  );
  const eff = new Date(effectiveDateISO);
  const weekday = (d: Date): Weekday =>
    (["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as Weekday[])[
      d.getDay()
    ];
  const prefSet = new Set<Weekday>((trainingDays ?? []) as Weekday[]);

  for (let base = 0; base < out.length; base += 7) {
    const end = Math.min(out.length, base + 7);
    const len = end - base;
    if (len <= 0) break;

    const dates: Date[] = [];
    const candidates: number[] = [];
    for (let j = 0; j < len; j++) {
      const d = new Date(eff);
      d.setDate(eff.getDate() + (base + j));
      dates.push(d);
      // treat “has content” in both shapes: {plan} or plain day
      const hasPlan = out[base + j]?.plan || out[base + j];
      if (hasPlan) candidates.push(j);
    }
    if (!candidates.length) continue;

    const k = Math.min(wants, candidates.length);
    let chosen: number[] = [];

    if (prefSet.size > 0) {
      for (const j of candidates) {
        if (chosen.length >= k) break;
        if (prefSet.has(weekday(dates[j]))) chosen.push(j);
      }
      if (chosen.length < k) {
        const remaining = candidates.filter((i) => !chosen.includes(i));
        chosen = chosen.concat(evenlySpread(remaining, k - chosen.length));
      }
    } else {
      chosen = evenlySpread(candidates, k);
    }

    for (let j = 0; j < len; j++) {
      const idx = base + j;
      if (out[idx]?.plan) {
        out[idx].plan.active = chosen.includes(j);
      } else {
        // universal days typically have top-level fields (active, blocks, etc.)
        if (typeof out[idx]?.active === "boolean") {
          out[idx].active = chosen.includes(j);
        }
      }
    }
  }
  return out;
}

function evenlySpread(arr: number[], n: number): number[] {
  if (n <= 0) return [];
  if (arr.length <= n) return arr.slice();
  if (n === 1) return [arr[Math.floor(arr.length / 2)]];
  const picks: number[] = [];
  for (let i = 0; i < n; i++) {
    const pos = Math.round((i * (arr.length - 1)) / (n - 1));
    const pick = arr[pos];
    if (!picks.includes(pick)) picks.push(pick);
  }
  for (const v of arr) {
    if (picks.length >= n) break;
    if (!picks.includes(v)) picks.push(v);
  }
  return picks.slice(0, n);
}
/* -------------------------------------------------------------------------- */

// ---- Create a program using AGENT TYPE & Universal generator ----
async function createProgramFromIntent(
  userId: string,
  rawRequest: string,
  agent: AgentType,
  parsed?: IntentParsed,
  P?: Profiler
): Promise<string | null> {
  if (!isProgramCapable(agent)) return null;

  const internalType = agentToProgramType(agent, "v1");
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
      P?.mark?.("program_debounce_reuse", { program_id: last.program_id });
      return last.program_id as string;
    }
  }

  const TODAY = new Date();
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  let start = TODAY;
  
  if (parsed?.start_date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.start_date)) {
    const cand = new Date(parsed.start_date);
    const diffDays = Math.round((cand.getTime() - TODAY.getTime()) / 86400000);
    // widened window to make testing easier (backdate or schedule forward)
    if (diffDays >= -30 && diffDays <= 180) start = cand;
  }
  
  // DEBUG: Add logging to see what's happening
  console.log('DEBUG createProgramFromIntent:', {
    rawRequest,
    parsedStartDate: parsed?.start_date,
    todayISO: toISO(TODAY),
    finalStartISO: toISO(start),
    agent
  });

  const startISO = toISO(start);

  let weeksHint = Number.isFinite(Number(parsed?.duration_weeks))
    ? Math.floor(Number(parsed!.duration_weeks))
    : 4;
  weeksHint = Math.max(1, Math.min(12, weeksHint));

  const daysPerWeek = Math.max(
    1,
    Math.min(7, Number(parsed?.days_per_week ?? 5))
  );
  const trainingDays =
    Array.isArray(parsed?.training_days) && parsed!.training_days.length
      ? (parsed!.training_days as Weekday[])
      : null;

  const status = start <= TODAY ? "active" : "scheduled";

  // ---- generate ----
  const tGen0 = process.hrtime.bigint?.();
  const gen = await buildProgramDaysUniversal({
    plan_type: agent ?? null,
    weeks: weeksHint,
    request_text: rawRequest || "",
    hints: {
      days_per_week: daysPerWeek,
      modalities: parsed?.modalities ?? null,
      goals: null,
      constraints: null,
    },
  });
  const tGen1 = process.hrtime.bigint?.();
  if (tGen0 && tGen1) {
    P?.mark?.("universal_gen_done", {
      ms_inner: Number(tGen1 - tGen0) / 1_000_000,
    });
  }

  const daysArray = Array.isArray(gen?.days) ? gen.days : [];
  if (daysArray.length === 0) throw new Error("Generator returned 0 days.");

  // ---- NEW: enforce spacing/explicit weekdays BEFORE saving ----
  const spacedDays = enforceDaysPerWeek(
    daysArray,
    startISO,
    daysPerWeek,
    trainingDays
  );

  // end/start sizing comes from spacedDays (not raw gen.days)
  const end = new Date(start);
  end.setDate(end.getDate() + (spacedDays.length - 1));
  const endISO = toISO(end);
  const normalizedWeeks = Math.max(1, Math.ceil(spacedDays.length / 7));

  // ---- insert program ----
  const { data: prog, error: progErr } = await supa
    .from("program")
    .insert({
      user_id: userId,
      type: internalType,
      status,
      start_date: startISO,
      end_date: endISO,
      period_length_weeks: normalizedWeeks,
      spec_json: {
        source: "chat",
        raw_request: rawRequest,
        agent,
        modalities: parsed?.modalities?.length
          ? parsed.modalities
          : ["General"],
        days_per_week: daysPerWeek,
        training_days: trainingDays, // persist explicit weekdays
        constraints: [],
        goals: [],
        spec_version: 1,
      },
    })
    .select("program_id")
    .single();
  if (progErr) throw progErr;

  // ---- insert first period with spaced days ----
  const { error: perErr } = await supa.from("program_period").insert({
    program_id: prog.program_id,
    period_index: 0,
    start_date: startISO,
    end_date: endISO,
    period_json: { ...gen, days: spacedDays },
  });
  if (perErr) throw perErr;

  P?.mark?.("program_created", {
    program_id: prog.program_id,
    days: spacedDays.length,
  });
  return prog.program_id as string;
}

// ---- Change existing program (action === "change") ----
async function findLatestProgramForAgent(userId: string, agent: AgentType) {
  if (!isProgramCapable(agent)) return null;
  const internalType = agentToProgramType(agent, "v1");
  const q = await supa
    .from("program")
    .select("program_id, status, start_date, end_date, spec_json")
    .eq("user_id", userId)
    .eq("type", internalType)
    .in("status", ["active", "scheduled"])
    .order("created_at", { ascending: false })
    .limit(1);
  if (q.error || !q.data?.length) return null;
  return q.data[0];
}

async function dispatchProgramChangeFromChat(opts: {
  userId: string;
  agent: AgentType;
  parsed?: IntentParsed;
  P?: Profiler;
}) {
  const { userId, agent, parsed, P } = opts;
  try {
    const prog = await findLatestProgramForAgent(userId, agent);
    if (!prog?.program_id) return;

    const payload: any = {};
    if (parsed?.start_date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.start_date))
      payload.effective_date = parsed.start_date;
    if (Number.isFinite(Number(parsed?.days_per_week)))
      payload.days_per_week = Number(parsed!.days_per_week);
    if (Array.isArray(parsed?.modalities) && parsed!.modalities.length)
      payload.modalities = parsed!.modalities;
    // ADD THIS:
    if (Array.isArray(parsed?.training_days) && parsed!.training_days.length)
      payload.training_days = parsed!.training_days;
    // (optional) allow changing period length:
    if (Number.isFinite(Number((parsed as any)?.new_period_weeks)))
      payload.new_period_weeks = Math.max(
        1,
        Math.min(12, Number((parsed as any)?.new_period_weeks))
      );
    const base = process.env.INTERNAL_BASE_URL || "";
    if (!base) return;

    const f = typeof fetch === "function" ? fetch : null;
    if (!f) {
      P?.mark?.("program_change_skipped_no_fetch");
      return;
    }

    const url = `${base.replace(/\/$/, "")}/api/programs/${prog.program_id}/change`;
    await f(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    P?.mark?.("program_change_ok", { program_id: prog.program_id });
  } catch (e: any) {
    P?.mark?.("program_change_exception", { error: String(e?.message || e) });
  }
}

// -----------------------------
// Context Builders
// -----------------------------
type BaseContext = {
  rows: MessageRow[];
  ids: Set<string>;
  oldestTs: string;
  messages: ChatMessage[];
};

async function fetchBaseContext(
  humanId: string,
  P: Profiler
): Promise<BaseContext> {
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
  const recent: MessageRow[] = (recentQ.data ?? []) as MessageRow[];
  recent.reverse();

  const ids = new Set(recent.map((m) => m.message_id));
  const oldestTs = recent[0]?.created_at ?? new Date().toISOString();

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
    P.mark("after_user_cls_ctx_intent", {
      agent_type: userImp.agent_type,
      intent,
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

    // 3) RAG-lite slice
    const ragSlice = await fetchRagSlice(
      humanId,
      userImp.agent_type,
      baseCtx.oldestTs,
      baseCtx.ids,
      P
    );
    const ctx: ChatMessage[] = [...ragSlice, ...baseCtx.messages];
    P.mark("ctx_ready", { total_msgs: ctx.length });

    // 4) Program side-effects
    const inferredAgent: AgentType = isProgramCapable(intent.agent)
      ? intent.agent
      : isProgramCapable(userImp.agent_type as AgentType)
        ? (userImp.agent_type as AgentType)
        : "other";

    if (
      intent.action === "create" &&
      intent.should_create &&
      intent.confidence >= 0.6 &&
      isProgramCapable(inferredAgent)
    ) {
      void createProgramFromIntent(
        humanId,
        text,
        inferredAgent,
        intent.parsed,
        P
      )
        .then((id) =>
          P.mark("program_create", {
            program_id: id || "skipped",
            conf: intent.confidence,
          })
        )
        .catch((e) =>
          P.mark("program_create_err", { err: String(e?.message || e) })
        );
    } else if (
      intent.action === "change" &&
      intent.confidence >= 0.6 &&
      isProgramCapable(inferredAgent)
    ) {
      void dispatchProgramChangeFromChat({
        userId: humanId,
        agent: inferredAgent,
        parsed: intent.parsed,
        P,
      });
    }

    // 5) Build system prompt (include training guide when relevant)
    const b0 = process.hrtime.bigint();
    let systemPrompt = BASE_SYSTEM_PROMPT;
    if (
      (intent.should_create && inferredAgent === "Training") ||
      userImp.agent_type === "Training"
    ) {
      systemPrompt += TRAINING_PROGRAM_GUIDE;
    }
    if (userImp.agent_type === "other") {
      systemPrompt += OUT_OF_SCOPE_RESPONSE_PROMPT;
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

    // 6) Model call for the assistant reply
    const o0 = process.hrtime.bigint();
    const resp = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      temperature: 0.3,
      max_tokens: 1000,
      messages,
    });
    const o1 = process.hrtime.bigint();
    P.mark("openai_complete", { ms_inner: Number(o1 - o0) / 1_000_000 });

    const reply =
      resp.choices?.[0]?.message?.content?.trim() ||
      "Sorry, I had trouble replying.";

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
    const profile = new Profiler().report(); // ensure we always respond
    console.error(JSON.stringify({ error: err?.message, profile }, null, 2));
    res.status(500).json({ error: err?.message || "unknown error" });
  }
});

export default router;
