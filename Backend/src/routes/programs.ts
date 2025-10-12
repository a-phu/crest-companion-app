import { Router } from "express";
import { supa } from "../supabase";
import { buildProgramDaysUniversal } from "../universalProgram";

const router = Router();

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

    // Compute end date from actual number of days
    const end = new Date(start);
    end.setDate(end.getDate() + (daysArray.length - 1));
    const endISO = end.toISOString().slice(0, 10);
    const startISO = start.toISOString().slice(0, 10);

    // Normalize period_length_weeks to match actual days for consistency
    const normalizedWeeks = Math.max(1, Math.ceil(daysArray.length / 7));

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

    // 3) Insert first period exactly as returned by generator ({ metadata, days })
    const { data: period, error: perErr } = await supa
      .from("program_period")
      .insert({
        program_id: prog.program_id,
        period_index: 0,
        start_date: startISO,
        end_date: endISO,
        period_json: gen,
      })
      .select("*")
      .single();
    if (perErr) throw perErr;

    res.json({ program: prog, period });
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

    const periods = await loadPeriods(programId);
    const plan = dayAt(periods, new Date(todayISO));

    if (!plan) return res.status(404).json({ error: "No plan found for today" });
    res.json({ program: prog, today: { date: todayISO, plan } });
  } catch (e: any) {
    console.error("GET /api/programs/:id/today error:", e);
    res.status(500).json({ error: e.message || "unknown error" });
  }
});

/**
 * GET /api/programs/:id/week?start=YYYY-MM-DD
 * Returns a 7-day slice.
 */
router.get("/:id/week", async (req, res) => {
  try {
    const programId = req.params.id;
    const startISO = (req.query.start as string) || new Date().toISOString().slice(0, 10);

    const periods = await loadPeriods(programId);
    const days: Array<{ date: string; plan: any }> = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startISO);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      days.push({ date: iso, plan: dayAt(periods, d) });
    }

    res.json({ week_start: startISO, days });
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
      const newLen = Math.max(
        0,
        Math.floor(
          (dayBefore.getTime() - new Date(overlapping.start_date).getTime()) / 86400000
        ) + 1
      );
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

    // 4) Size end date by returned length
    const newEnd = new Date(eff);
    newEnd.setDate(newEnd.getDate() + (daysArray.length - 1));
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
        period_json: gen, // {metadata, days}
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

    const { data: period, error: perErr } = await supa
      .from("program_period")
      .select("program_period_id, start_date")
      .eq("program_id", programId)
      .eq("period_index", periodIndex)
      .maybeSingle();
    if (perErr) throw perErr;
    if (!period) return res.status(404).json({ error: "Period not found" });

    const start = new Date(String(period.start_date));
    const end = new Date(start);
    end.setDate(end.getDate() + Math.max(0, days.length - 1));

    const { error: updErr } = await supa
      .from("program_period")
      .update({
        end_date: end.toISOString().slice(0, 10),
        period_json: { days },
      })
      .eq("program_period_id", period.program_period_id);
    if (updErr) throw updErr;

    res.json({ ok: true, program_id: programId, period_index: periodIndex, days: days.length });
  } catch (e: any) {
    console.error("PATCH /api/programs/:id/periods/:index error:", e);
    res.status(500).json({ error: e.message || "unknown error" });
  }
});

// Rolling window helper
router.get("/:id/window", async (req, res) => {
  try {
    const programId = req.params.id;
    const startISO = String(req.query.start || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const daysN = Math.max(1, Math.min(60, Number(req.query.days ?? 7)));

    const periods = await loadPeriods(programId);

    const out: Array<{ date: string; plan: any }> = [];
    const start = new Date(startISO);
    for (let i = 0; i < daysN; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push({ date: d.toISOString().slice(0, 10), plan: dayAt(periods, d) });
    }

    res.json({ window_start: startISO, days: daysN, items: out });
  } catch (e: any) {
    console.error("GET /api/programs/:id/window error:", e);
    res.status(500).json({ error: e.message || "unknown error" });
  }
});

export default router;

// ---------- helpers ----------
async function loadPeriods(programId: string) {
  const { data, error } = await supa
    .from("program_period")
    .select("period_index,start_date,end_date,period_json")
    .eq("program_id", programId)
    .order("period_index", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((p) => ({
    period_index: p.period_index as number,
    start: new Date(String(p.start_date)),
    end: new Date(String(p.end_date)),
    // period_json may be { metadata, days } or just { days }
    days: Array.isArray((p as any).period_json?.days)
      ? (p as any).period_json.days
      : Array.isArray((p as any).period_json)
      ? (p as any).period_json
      : [],
  }));
}

function dayAt(periods: Array<{ start: Date; end: Date; days: any[] }>, d: Date) {
  for (const per of periods) {
    if (d >= per.start && d <= per.end) {
      const idx = Math.floor((d.getTime() - per.start.getTime()) / 86400000);
      return per.days[idx] ?? null;
    }
  }
  return null;
}
