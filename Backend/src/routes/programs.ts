// backend/src/routes/programs.ts
import { Router } from "express";
import { supa } from "../supabase";
import { buildProgramDaysUniversal, normalizeLength } from "../universalProgram";
import period from "../program/period";

const router = Router();

// --- helpers: enforce days_per_week with spacing or explicit training_days ---
type Weekday = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

// UTC-safe day math to avoid timezone drift
const MS_PER_DAY = 86_400_000;
function dateFromISO_utc(iso: string) {
  // iso: "YYYY-MM-DD"
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function addDaysUTC(base: Date, n: number) {
  return new Date(base.getTime() + n * MS_PER_DAY);
}
function weekdayUTC(d: Date): Weekday {
  return (["Sun","Mon","Tue","Wed","Thu","Fri","Sat"] as Weekday[])[d.getUTCDay()];
}

/**
 * Enforces `days_per_week` inside each 7-day block starting from `effectiveDateISO` (UTC).
 * - If `training_days` provided, we activate those weekdays first.
 * - Otherwise we evenly distribute among days that already have content.
 * - Never invents content: only toggles `plan.active` on days that already have a plan.
 */
function enforceDaysPerWeek(
  days: Array<{ plan?: any }>,
  effectiveDateISO: string,
  daysPerWeek: number,
  trainingDays?: Weekday[] | null
) {
  const wants = Math.max(0, Math.min(7, Number(daysPerWeek || 0)));
  if (wants === 7) return days;

  const out = days.map((d) => (d?.plan ? { ...d, plan: { ...d.plan } } : d));
  const eff = dateFromISO_utc(effectiveDateISO);
  const prefSet = new Set<Weekday>((trainingDays ?? []) as Weekday[]);

  for (let base = 0; base < out.length; base += 7) {
    const end = Math.min(out.length, base + 7);
    const len = end - base;
    if (len <= 0) break;

    const candidates: number[] = [];
    const dates: Date[] = [];
    for (let j = 0; j < len; j++) {
      const d = addDaysUTC(eff, base + j);
      dates.push(d);
      if (out[base + j]?.plan) candidates.push(j);
    }
    if (!candidates.length) continue;

    const k = Math.min(wants, candidates.length);
    let chosen: number[] = [];

    if (prefSet.size > 0) {
      for (const j of candidates) {
        if (chosen.length >= k) break;
        if (prefSet.has(weekdayUTC(dates[j]))) chosen.push(j);
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
      if (!out[idx]?.plan) continue;
      out[idx].plan.active = chosen.includes(j);
    }
  }

  return out;
}

/** Pick n indices from arr, spread as evenly as possible */
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
  for (const v of arr) { if (picks.length >= n) break; if (!picks.includes(v)) picks.push(v); }
  return picks.slice(0, n);
}
/* ---------- helper to append a period, supporting exact day counts ---------- */
async function appendPeriodToCover(
  programId: string,
  startISO: string,            // first missing date (YYYY-MM-DD)
  weeksHint: number,           // e.g. 4
  spec: any,                   // program.spec_json
  exactDays?: number           // if provided, force exactly this many days
) {
  const targetDays = Math.max(1, exactDays ?? weeksHint * 7);

  // Generate enough days to cover the target
  const gen = await buildProgramDaysUniversal({
    plan_type: spec?.agent ?? null,
    weeks: Math.ceil(targetDays / 7),
    request_text: spec?.raw_request || "Extend program horizon.",
    hints: {
      days_per_week: spec?.days_per_week ?? 5,
      modalities: spec?.modalities ?? ["General"],
      goals: spec?.goals ?? [],
      constraints: spec?.constraints ?? [],
    },
  });

  const daysArray = Array.isArray(gen?.days) ? gen.days : [];
  if (daysArray.length === 0) throw new Error("Generator returned 0 days.");

  // Force exact length, then apply spacing/weekdays
  const normalized = normalizeLength(daysArray, targetDays, spec?.agent ?? "Training");
  const spacedDays = enforceDaysPerWeek(
    normalized,
    startISO,
    spec?.days_per_week ?? 5,
    (spec as any)?.training_days ?? null
  );

  // Compute end date from actually saved length (UTC)
  const eff = dateFromISO_utc(startISO);
  const newEnd = addDaysUTC(eff, spacedDays.length - 1);
  const newEndISO = newEnd.toISOString().slice(0, 10);

  // Next period index
  const { data: existing, error: exErr } = await supa
    .from("program_period")
    .select("period_index")
    .eq("program_id", programId)
    .order("period_index", { ascending: false })
    .limit(1);
  if (exErr) throw exErr;
  const nextIndex = (existing?.[0]?.period_index ?? -1) + 1;

  const { error: insErr } = await supa.from("program_period").insert({
    program_id: programId,
    period_index: nextIndex,
    start_date: startISO,
    end_date: newEndISO,
    period_json: { ...gen, days: spacedDays },
  });
  if (insErr) throw insErr;

  return { start_date: startISO, end_date: newEndISO, days: spacedDays.length, period_index: nextIndex };
}

/**
 * POST /api/programs
 * Creates a program and its first period with generated JSON days.
 */
router.post("/", async (req, res) => {
  try {
    const { user_id, type, start_date, period_length_weeks = 4, spec_json = {} } = req.body || {};
    if (!user_id || !type) {
      return res.status(400).json({ error: "user_id and type are required" });
    }

    const start = start_date ? new Date(start_date) : new Date();
    const status = start <= new Date() ? "active" : "scheduled";

    const canonicalSpec = {
      source: spec_json?.source ?? "api",
      raw_request: spec_json?.raw_request ?? "",
      agent: spec_json?.agent ?? "Training",
      modalities: Array.isArray(spec_json?.modalities) ? spec_json.modalities : ["General"],
      days_per_week: Number(spec_json?.days_per_week ?? 5),
      // optional: allow user to pass explicit weekdays
      training_days: Array.isArray(spec_json?.training_days) ? spec_json.training_days : null,
      constraints: Array.isArray(spec_json?.constraints) ? spec_json.constraints : [],
      goals: Array.isArray(spec_json?.goals) ? spec_json.goals : [],
      spec_version: Number(spec_json?.spec_version ?? 1),
    };

    // 1) Generate via Universal generator FIRST (so we can size dates from actual days)
    const gen = await buildProgramDaysUniversal({
      plan_type: canonicalSpec.agent ?? null,
      weeks: period_length_weeks, // just a hint; generator may return != weeks*7
      request_text: canonicalSpec.raw_request || "",
      hints: {
        days_per_week: canonicalSpec.days_per_week,
        modalities: canonicalSpec.modalities,
        goals: canonicalSpec.goals,
        constraints: canonicalSpec.constraints,
      },
    });

    const daysArray = Array.isArray(gen?.days) ? gen.days : [];
    if (daysArray.length === 0) {
      return res.status(500).json({ error: "Generator returned 0 days." });
    }

    const startISO = start.toISOString().slice(0, 10);

    // Enforce spacing / explicit weekdays BEFORE saving the period
    const spacedDays = enforceDaysPerWeek(
      daysArray,
      startISO,
      canonicalSpec.days_per_week ?? 5,
      (canonicalSpec as any).training_days ?? null
    );

    // Compute end date from actual number of days
    const end = new Date(start);
    end.setDate(end.getDate() + (spacedDays.length - 1));
    const endISO = end.toISOString().slice(0, 10);

    // Normalize period_length_weeks to match actual days for consistency
    const normalizedWeeks = Math.max(1, Math.ceil(spacedDays.length / 7));

    // 2) Create program shell sized by generator output
    const { data: prog, error: progErr } = await supa
      .from("program")
      .insert({
        user_id,
        type,
        status,
        start_date: startISO,
        end_date: endISO,
        period_length_weeks: normalizedWeeks,
        spec_json: canonicalSpec,
      })
      .select("*")
      .single();
    if (progErr) throw progErr;

    // 3) Insert first period exactly as returned by generator ({ metadata, days }) with spacing applied
    const { data: periodRow, error: perErr } = await supa
      .from("program_period")
      .insert({
        program_id: prog.program_id,
        period_index: 0,
        start_date: startISO,
        end_date: endISO,
        period_json: { ...gen, days: spacedDays },
      })
      .select("*")
      .single();
    if (perErr) throw perErr;

    res.json({ program: prog, period: periodRow });
  } catch (e: any) {
    console.error("POST /api/programs error:", e);
    res.status(500).json({ error: e.message || "unknown error" });
  }
});

router.get("/:programId", async (req, res) => {
  const { programId } = req.params;
  const q = await supa
    .from("program")
    .select("*")
    .eq("program_id", programId)
    .maybeSingle();
  if (q.error) return res.status(500).json({ error: q.error.message });
  if (!q.data) return res.status(404).json({ error: "Program not found" });
  return res.json(q.data);
});

/**
 * GET /api/programs/:id/today
 * Returns today’s plan.
 */
router.get("/:id/today", async (req, res) => {
  try {
    const programId = req.params.id;
    const todayISO = new Date().toISOString().slice(0, 10);

    const { data: prog, error: progErr } = await supa
      .from("program")
      .select("*")
      .eq("program_id", programId)
      .maybeSingle();
    if (progErr) throw progErr;
    if (!prog) return res.status(404).json({ error: "Program not found" });

    if (prog.status === "scheduled" && todayISO >= prog.start_date) {
      await supa.from("program").update({ status: "active" }).eq("program_id", programId);
      prog.status = "active";
    }

    const periods = await period.loadPeriods(programId);
    const plan = period.dayAt(periods, new Date(todayISO));

    if (!plan) return res.status(404).json({ error: "No plan found for today" });
    res.json({ program: prog, today: { date: todayISO, plan } });
  } catch (e: any) {
    console.error("GET /api/programs/:id/today error:", e);
    res.status(500).json({ error: e.message || "unknown error" });
  }
});

/**
 * GET /api/programs/:id/week?start=YYYY-MM-DD
 * Returns a 7-day slice. If not fully covered, returns partial + needs_extension hint.
 */
router.get("/:id/week", async (req, res) => {
  try {
    const programId = req.params.id;
    const startISO = (req.query.start as string) || new Date().toISOString().slice(0, 10);

    const periods = await period.loadPeriods(programId);
    const days: Array<{ date: string; plan: any }> = [];

    // find the last stored end date across all periods
    const lastEndISO = periods.length
      ? (periods as any[]).map((p) => p.end_date).sort().slice(-1)[0]
      : null;

    let missingFromISO: string | null = null;

    for (let i = 0; i < 7; i++) {
      const d = new Date(startISO);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0, 10);

      const inRange = !lastEndISO || iso <= lastEndISO;
      const plan = inRange ? period.dayAt(periods, d) : null;

      days.push({ date: iso, plan });

      if ((!inRange || plan == null) && !missingFromISO) {
        missingFromISO = iso; // first gap we can’t serve
      }
    }

    const payload: any = { week_start: startISO, days };

    if (missingFromISO) {
      const gapIndex = days.findIndex((x) => x.date === missingFromISO);
      const required = 7 - gapIndex;
      payload.needs_extension = {
        from: missingFromISO,
        required_days: required,
        hint: "POST /api/programs/:id/extend with { from, weeks_hint }",
      };
    }

    res.json(payload);
  } catch (e: any) {
    console.error("GET /api/programs/:id/week error:", e);
    res.status(500).json({ error: e.message || "unknown error" });
  }
});

/**
 * POST /api/programs/:id/change
 * Regenerates from an effective date using Universal generator; sizes dates by returned length.
 */
router.post("/:id/change", async (req, res) => {
  try {
    const programId = req.params.id;
    const { effective_date, spec_patch = {}, new_period_weeks = 4 } = req.body || {};
    if (!effective_date) return res.status(400).json({ error: "effective_date required (YYYY-MM-DD)" });

    const { data: prog, error: progErr } = await supa
      .from("program")
      .select("*")
      .eq("program_id", programId)
      .maybeSingle();
    if (progErr) throw progErr;
    if (!prog) return res.status(404).json({ error: "Program not found" });

    const currentSpec = prog.spec_json || {};
    const mergedSpec = {
      ...currentSpec,
      ...spec_patch,
      days_per_week: Number.isFinite(Number(spec_patch.days_per_week))
        ? Math.max(1, Math.min(7, Number(spec_patch.days_per_week)))
        : currentSpec.days_per_week ?? 5,
      modalities: Array.isArray(spec_patch.modalities)
        ? spec_patch.modalities
        : currentSpec.modalities ?? ["General"],
      // optional explicit weekdays
      training_days: Array.isArray(spec_patch.training_days)
        ? spec_patch.training_days
        : (currentSpec.training_days ?? null),
      goals: Array.isArray(spec_patch.goals) ? spec_patch.goals : currentSpec.goals ?? [],
      constraints: Array.isArray(spec_patch.constraints)
        ? spec_patch.constraints
        : currentSpec.constraints ?? [],
      spec_version: Number(currentSpec.spec_version ?? 1) + 1,
    };

    // 1) Trim overlapping period up to dayBefore
    const eff = new Date(effective_date);
    const dayBefore = new Date(eff);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const dayBeforeISO = dayBefore.toISOString().slice(0, 10);

    const { data: overlapping, error: ovErr } = await supa
      .from("program_period")
      .select("*")
      .eq("program_id", programId)
      .lte("start_date", effective_date)
      .gte("end_date", effective_date)
      .maybeSingle();
    if (ovErr) throw ovErr;

    if (overlapping) {
      const newLen =
        Math.max(
          0,
          Math.floor(
            (dayBefore.getTime() - new Date(overlapping.start_date).getTime()) / 86400000
          )
        ) + 1;
      const trimmed = Array.isArray(overlapping.period_json?.days)
        ? overlapping.period_json.days.slice(0, newLen)
        : [];

      await supa
        .from("program_period")
        .update({
          end_date: dayBeforeISO,
          period_json: { days: trimmed },
        })
        .eq("program_period_id", overlapping.program_period_id);
    }

    // 2) Delete strictly future periods
    await supa.from("program_period").delete().eq("program_id", programId).gt("start_date", effective_date);

    // 3) Generate the new segment
    const gen = await buildProgramDaysUniversal({
      plan_type: mergedSpec.agent ?? null,
      weeks: new_period_weeks, // hint; we will size by gen.days
      request_text: mergedSpec.raw_request || "Apply program changes effective this date.",
      hints: {
        days_per_week: mergedSpec.days_per_week ?? 5,
        modalities: mergedSpec.modalities ?? ["General"],
        goals: mergedSpec.goals ?? [],
        constraints: mergedSpec.constraints ?? [],
      },
    });

    const daysArray = Array.isArray(gen?.days) ? gen.days : [];
    if (daysArray.length === 0) {
      return res.status(500).json({ error: "Generator returned 0 days." });
    }

    // Enforce spacing / explicit weekdays BEFORE saving the new period
    const spacedDays = enforceDaysPerWeek(
      daysArray,
      effective_date,
      mergedSpec.days_per_week ?? 5,
      (mergedSpec as any).training_days ?? null
    );

    // 4) Size end date by returned length
    const newEnd = new Date(eff);
    newEnd.setDate(newEnd.getDate() + (spacedDays.length - 1));
    const newEndISO = newEnd.toISOString().slice(0, 10);

    // Next period index
    const { data: existing, error: exErr } = await supa
      .from("program_period")
      .select("period_index")
      .eq("program_id", programId)
      .order("period_index", { ascending: false })
      .limit(1);
    if (exErr) throw exErr;
    const nextIndex = (existing?.[0]?.period_index ?? -1) + 1;

    // Insert new period
    const { error: insErr } = await supa
      .from("program_period")
      .insert({
        program_id: programId,
        period_index: nextIndex,
        start_date: effective_date,
        end_date: newEndISO,
        period_json: { ...gen, days: spacedDays }, // {metadata, days} with spacing applied
      });
    if (insErr) throw insErr;

    // Persist spec change
    await supa.from("program").update({ spec_json: mergedSpec }).eq("program_id", programId);

    res.json({ ok: true, program_id: programId, effective_date, spec_json: mergedSpec });
  } catch (e: any) {
    console.error("POST /api/programs/:id/change error:", e);
    res.status(500).json({ error: e.message || "unknown error" });
  }
});

/**
 * PATCH /api/programs/:id/periods/:index
 * Allows manual replacement of a period’s days.
 */
router.patch("/:id/periods/:index", async (req, res) => {
  try {
    const programId = req.params.id;
    const periodIndex = Number(req.params.index);
    const days = req.body?.days;
    if (!Array.isArray(days)) return res.status(400).json({ error: "Body must have `days: []`" });

    const { data: periodRow, error: perErr } = await supa
      .from("program_period")
      .select("program_period_id, start_date")
      .eq("program_id", programId)
      .eq("period_index", periodIndex)
      .maybeSingle();
    if (perErr) throw perErr;
    if (!periodRow) return res.status(404).json({ error: "Period not found" });

    const start = new Date(String(periodRow.start_date));
    const end = new Date(start);
    end.setDate(end.getDate() + Math.max(0, days.length - 1));

    const { error: updErr } = await supa
      .from("program_period")
      .update({
        end_date: end.toISOString().slice(0, 10),
        period_json: { days },
      })
      .eq("program_period_id", periodRow.program_period_id);
    if (updErr) throw updErr;

    res.json({ ok: true, program_id: programId, period_index: periodIndex, days: days.length });
  } catch (e: any) {
    console.error("PATCH /api/programs/:id/periods/:index error:", e);
    res.status(500).json({ error: e.message || "unknown error" });
  }
});

router.post("/:id/extend", async (req, res) => {
  try {
    const programId = req.params.id;
    const fromISO = String(req.body?.from || "").slice(0, 10);

    const requiredDays = Number.isFinite(Number(req.body?.required_days))
      ? Math.max(1, Number(req.body.required_days))
      : null;

    const weeksHint = requiredDays
      ? Math.ceil(requiredDays / 7)
      : Math.max(1, Number(req.body?.weeks_hint || 4));

    if (!fromISO) return res.status(400).json({ error: "from required (YYYY-MM-DD)" });

    const { data: prog, error: progErr } = await supa
      .from("program").select("*").eq("program_id", programId).maybeSingle();
    if (progErr) throw progErr;
    if (!prog) return res.status(404).json({ error: "Program not found" });

    // Ensure we only append forward of the last end_date
    const periods = await period.loadPeriods(programId);
    const lastEndISO = periods.length
      ? periods.map((p: any) => p.end_date).reduce((a: string, b: string) => (a > b ? a : b))
      : null;

    if (lastEndISO && fromISO <= lastEndISO) {
      return res.status(400).json({ error: `from (${fromISO}) must be after last end_date (${lastEndISO})` });
    }

    const appended = await appendPeriodToCover(
      programId,
      fromISO,
      weeksHint,
      prog.spec_json || {},
      requiredDays ?? undefined
    );

    // keep parent program end_date in sync
    await supa.from("program").update({ end_date: appended.end_date }).eq("program_id", programId);

    res.json({ ok: true, appended });
  } catch (e: any) {
    console.error("POST /api/programs/:id/extend error:", e);
    res.status(500).json({ error: e.message || "unknown error" });
  }
});
// Rolling window helper
router.get("/:id/window", async (req, res) => {
  try {
    const programId = req.params.id;
    const startISO = String(req.query.start || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const daysN = Math.max(1, Math.min(60, Number(req.query.days ?? 7)));

    const periods = await period.loadPeriods(programId);

    const out: Array<{ date: string; plan: any }> = [];
    const start = new Date(startISO);
    for (let i = 0; i < daysN; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push({ date: d.toISOString().slice(0, 10), plan: period.dayAt(periods, d) });
    }

    res.json({ window_start: startISO, days: daysN, items: out });
  } catch (e: any) {
    console.error("GET /api/programs/:id/window error:", e);
    res.status(500).json({ error: e.message || "unknown error" });
  }
});

/**
 * GET /api/programs/:id/week-titles
 * Returns an array of titles for 7 days starting from the given date (default: today).
 * To get the next week, set ?start=YYYY-MM-DD to 7 days after the current week start.
 */
router.get("/:id/week-titles", async (req, res) => {
  try {
    const programId = req.params.id;
    const startISO = (req.query.start as string) || new Date().toISOString().slice(0, 10);

    const periods = await period.loadPeriods(programId);
    const titles: string[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startISO);
      d.setDate(d.getDate() + i);
      const plan = period.dayAt(periods, d);
      if (plan && typeof plan.title === "string") {
        titles.push(plan.title);
      } else {
        titles.push("");
      }
    }

    res.json({ week_start: startISO, titles });
  } catch (e: any) {
    console.error("GET /api/programs/:id/week-titles error:", e);
    res.status(500).json({ error: e.message || "unknown error" });
  }
});



export default router;

