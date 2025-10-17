// backend/src/routes/programs.ts
// This file handles all program-related API endpoints for managing fitness/training programs
// Programs are structured with periods (time blocks) that contain daily plans

import { Router } from "express";
import { supa } from "../supabase";
import { buildProgramDaysUniversal, normalizeLength } from "../universalProgram";
import period from "../program/period";

const router = Router();

// --- helpers: enforce days_per_week with spacing or explicit training_days ---
// Define weekday types for type safety when handling training schedules
type Weekday = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

// UTC-safe date calculations to prevent timezone-related bugs
const MS_PER_DAY = 86_400_000; // Milliseconds in 24 hours

// Convert ISO date string (YYYY-MM-DD) to UTC Date object
function dateFromISO_utc(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)); // Month is 0-indexed in Date constructor
}

// Add specified number of days to a date using UTC calculations
function addDaysUTC(base: Date, n: number) {
  return new Date(base.getTime() + n * MS_PER_DAY);
}

// Get weekday name from UTC date to avoid timezone shifts
function weekdayUTC(d: Date): Weekday {
  return (["Sun","Mon","Tue","Wed","Thu","Fri","Sat"] as Weekday[])[d.getUTCDay()];
}

/**
 * Core scheduling algorithm: Enforces training frequency within weekly blocks
 * 
 * This function ensures users train the specified number of days per week while
 * respecting their preferred training days and maintaining proper rest intervals.
 * 
 * @param days - Array of day objects, each potentially containing a training plan
 * @param effectiveDateISO - Starting date for the schedule (YYYY-MM-DD format)
 * @param daysPerWeek - Target training frequency (1-7 days per week)
 * @param trainingDays - Optional array of preferred weekdays for training
 * 
 * Business Logic:
 * - Never creates new content, only activates/deactivates existing plans
 * - Prioritizes user-specified training days when provided
 * - Falls back to even distribution when no preferences given
 * - Operates on 7-day blocks to maintain weekly structure
 */
function enforceDaysPerWeek(
  days: Array<{ plan?: any }>,
  effectiveDateISO: string,
  daysPerWeek: number,
  trainingDays?: Weekday[] | null
) {
  // Validate and constrain training frequency to realistic bounds
  const wants = Math.max(0, Math.min(7, Number(daysPerWeek || 0)));
  if (wants === 7) return days; // If training every day, no scheduling needed

  // Create shallow copy to avoid mutating input data
  const out = days.map((d) => (d?.plan ? { ...d, plan: { ...d.plan } } : d));
  const eff = dateFromISO_utc(effectiveDateISO);
  const prefSet = new Set<Weekday>((trainingDays ?? []) as Weekday[]);

  // Process schedule in 7-day weekly blocks
  for (let base = 0; base < out.length; base += 7) {
    const end = Math.min(out.length, base + 7);
    const len = end - base;
    if (len <= 0) break;

    // Find all days in this week that have training content available
    const candidates: number[] = [];
    const dates: Date[] = [];
    for (let j = 0; j < len; j++) {
      const d = addDaysUTC(eff, base + j);
      dates.push(d);
      if (out[base + j]?.plan) candidates.push(j); // Only days with existing plans
    }
    if (!candidates.length) continue; // Skip weeks with no training content

    // Determine optimal training days for this week
    const k = Math.min(wants, candidates.length); // Can't train more days than we have content
    let chosen: number[] = [];

    if (prefSet.size > 0) {
      // Strategy 1: Prioritize user's preferred training days
      for (const j of candidates) {
        if (chosen.length >= k) break;
        if (prefSet.has(weekdayUTC(dates[j]))) chosen.push(j);
      }
      // Fill remaining slots if we haven't reached target frequency
      if (chosen.length < k) {
        const remaining = candidates.filter((i) => !chosen.includes(i));
        chosen = chosen.concat(evenlySpread(remaining, k - chosen.length));
      }
    } else {
      // Strategy 2: Distribute training days evenly across the week
      chosen = evenlySpread(candidates, k);
    }

    // Apply the scheduling decision by setting active/inactive status
    for (let j = 0; j < len; j++) {
      const idx = base + j;
      if (!out[idx]?.plan) continue;
      out[idx].plan.active = chosen.includes(j); // true = training day, false = rest day
    }
  }

  return out;
}

/**
 * Algorithm for evenly distributing training days across available slots
 * 
 * This creates optimal spacing between training sessions to allow for recovery.
 * For example: if training 3 days from 7 available, might choose days 1, 3, 6
 * rather than clustering them as days 1, 2, 3.
 */
function evenlySpread(arr: number[], n: number): number[] {
  if (n <= 0) return [];
  if (arr.length <= n) return arr.slice(); // Take all available if we need more than available
  if (n === 1) return [arr[Math.floor(arr.length / 2)]]; // Single day: choose middle

  // Calculate evenly spaced positions
  const picks: number[] = [];
  for (let i = 0; i < n; i++) {
    const pos = Math.round((i * (arr.length - 1)) / (n - 1));
    const pick = arr[pos];
    if (!picks.includes(pick)) picks.push(pick);
  }
  
  // Fill any gaps if rounding created duplicates
  for (const v of arr) { 
    if (picks.length >= n) break; 
    if (!picks.includes(v)) picks.push(v); 
  }
  
  return picks.slice(0, n);
}

/* ---------- helper to append a period, supporting exact day counts ---------- */
/**
 * Extends a program by adding a new training period
 * 
 * This function generates new training content and appends it to an existing program.
 * Used when users need more training days than currently scheduled.
 * 
 * @param programId - Database ID of the program to extend
 * @param startISO - Date to start the new period (YYYY-MM-DD)
 * @param weeksHint - Approximate length in weeks (AI may adjust)
 * @param spec - Program specifications (training type, frequency, etc.)
 * @param exactDays - If provided, generate exactly this many days
 */
async function appendPeriodToCover(
  programId: string,
  startISO: string,
  weeksHint: number,
  spec: any,
  exactDays?: number
) {
  // Calculate target duration - use exact days if specified, otherwise estimate from weeks
  const targetDays = Math.max(1, exactDays ?? weeksHint * 7);

  // Generate new training content using AI-powered universal generator
  const gen = await buildProgramDaysUniversal({
    plan_type: spec?.agent ?? null,
    weeks: Math.ceil(targetDays / 7), // Convert days back to weeks for generator
    request_text: spec?.raw_request || "Extend program horizon.",
    hints: {
      days_per_week: spec?.days_per_week ?? 5,
      modalities: spec?.modalities ?? ["General"], // Training types (strength, cardio, etc.)
      goals: spec?.goals ?? [],
      constraints: spec?.constraints ?? [], // Limitations (injuries, equipment, etc.)
    },
  });

  const daysArray = Array.isArray(gen?.days) ? gen.days : [];
  if (daysArray.length === 0) throw new Error("Generator returned 0 days.");

  // Normalize to exact length and apply training frequency rules
  const normalized = normalizeLength(daysArray, targetDays, spec?.agent ?? "Training");
  const spacedDays = enforceDaysPerWeek(
    normalized,
    startISO,
    spec?.days_per_week ?? 5,
    (spec as any)?.training_days ?? null
  );

  // Calculate end date based on actual generated content length
  const eff = dateFromISO_utc(startISO);
  const newEnd = addDaysUTC(eff, spacedDays.length - 1);
  const newEndISO = newEnd.toISOString().slice(0, 10);

  // Determine the next period index for database organization
  const { data: existing, error: exErr } = await supa
    .from("program_period")
    .select("period_index")
    .eq("program_id", programId)
    .order("period_index", { ascending: false })
    .limit(1);
  if (exErr) throw exErr;
  const nextIndex = (existing?.[0]?.period_index ?? -1) + 1;

  // Save the new period to database
  const { error: insErr } = await supa.from("program_period").insert({
    program_id: programId,
    period_index: nextIndex,
    start_date: startISO,
    end_date: newEndISO,
    period_json: { ...gen, days: spacedDays }, // Includes both metadata and daily plans
  });
  if (insErr) throw insErr;

  return { start_date: startISO, end_date: newEndISO, days: spacedDays.length, period_index: nextIndex };
}

/**
 * POST /api/programs
 * Creates a new training program with AI-generated content
 * 
 * This is the main endpoint for program creation. It:
 * 1. Validates input parameters
 * 2. Generates training content using AI
 * 3. Applies scheduling rules (training frequency, preferred days)
 * 4. Saves both program metadata and first training period
 */
router.post("/", async (req, res) => {
  try {
    const { user_id, type, start_date, period_length_weeks = 4, spec_json = {} } = req.body || {};
    
    // Validate required fields
    if (!user_id || !type) {
      return res.status(400).json({ error: "user_id and type are required" });
    }

    // Determine program start date and initial status
    const start = start_date ? new Date(start_date) : new Date();
    const status = start <= new Date() ? "active" : "scheduled"; // Programs can be scheduled for future

    // Build canonical specification object with defaults
    const canonicalSpec = {
      source: spec_json?.source ?? "api",
      raw_request: spec_json?.raw_request ?? "",
      agent: spec_json?.agent ?? "Training", // AI agent type (Training, Nutrition, etc.)
      modalities: Array.isArray(spec_json?.modalities) ? spec_json.modalities : ["General"],
      days_per_week: Number(spec_json?.days_per_week ?? 5),
      training_days: Array.isArray(spec_json?.training_days) ? spec_json.training_days : null, // e.g., ["Mon", "Wed", "Fri"]
      constraints: Array.isArray(spec_json?.constraints) ? spec_json.constraints : [],
      goals: Array.isArray(spec_json?.goals) ? spec_json.goals : [],
      spec_version: Number(spec_json?.spec_version ?? 1),
    };

    // 1) Generate training content using Universal AI generator
    // This creates the actual daily workout plans, nutrition guidance, etc.
    const gen = await buildProgramDaysUniversal({
      plan_type: canonicalSpec.agent ?? null,
      weeks: period_length_weeks,
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

    // 2) Apply scheduling logic BEFORE saving
    // This ensures training frequency and preferred days are respected
    const spacedDays = enforceDaysPerWeek(
      daysArray,
      startISO,
      canonicalSpec.days_per_week ?? 5,
      (canonicalSpec as any).training_days ?? null
    );

    // 3) Calculate program end date based on actual content length
    const end = new Date(start);
    end.setDate(end.getDate() + (spacedDays.length - 1));
    const endISO = end.toISOString().slice(0, 10);

    // Normalize period length to match actual generated content
    const normalizedWeeks = Math.max(1, Math.ceil(spacedDays.length / 7));

    // 4) Create program shell in database
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

    // 5) Insert first training period with scheduled content
    const { data: periodRow, error: perErr } = await supa
      .from("program_period")
      .insert({
        program_id: prog.program_id,
        period_index: 0, // First period
        start_date: startISO,
        end_date: endISO,
        period_json: { ...gen, days: spacedDays }, // Complete training data
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

// GET /api/programs/:programId - Retrieve program metadata
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
 * Returns today's specific training plan for immediate use
 * 
 * This endpoint is crucial for daily app usage - it tells users
 * exactly what they should do today (workout, nutrition, etc.)
 */
router.get("/:id/today", async (req, res) => {
  try {
    const programId = req.params.id;
    const todayISO = new Date().toISOString().slice(0, 10); // Current date in YYYY-MM-DD format

    // Retrieve program metadata
    const { data: prog, error: progErr } = await supa
      .from("program")
      .select("*")
      .eq("program_id", programId)
      .maybeSingle();
    if (progErr) throw progErr;
    if (!prog) return res.status(404).json({ error: "Program not found" });

    // Auto-activate scheduled programs when their start date arrives
    if (prog.status === "scheduled" && todayISO >= prog.start_date) {
      await supa.from("program").update({ status: "active" }).eq("program_id", programId);
      prog.status = "active";
    }

    // Load all periods and find today's specific plan
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
 * Returns a 7-day training schedule view with extension hints
 * 
 * This powers weekly calendar views in the app and automatically
 * detects when more content needs to be generated.
 */
router.get("/:id/week", async (req, res) => {
  try {
    const programId = req.params.id;
    const startISO = (req.query.start as string) || new Date().toISOString().slice(0, 10);

    const periods = await period.loadPeriods(programId);
    const days: Array<{ date: string; plan: any }> = [];

    // Find the last date we have content for
    const lastEndISO = periods.length
      ? (periods as any[]).map((p) => p.end_date).sort().slice(-1)[0]
      : null;

    let missingFromISO: string | null = null;

    // Build 7-day view, tracking where content gaps begin
    for (let i = 0; i < 7; i++) {
      const d = new Date(startISO);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0, 10);

      // Check if this date is within our generated content range
      const inRange = !lastEndISO || iso <= lastEndISO;
      const plan = inRange ? period.dayAt(periods, d) : null;

      days.push({ date: iso, plan });

      // Track first date where we need more content
      if ((!inRange || plan == null) && !missingFromISO) {
        missingFromISO = iso;
      }
    }

    const payload: any = { week_start: startISO, days };

    // Provide client with information about content gaps
    if (missingFromISO) {
      const gapIndex = days.findIndex((x) => x.date === missingFromISO);
      const required = 7 - gapIndex; // Days needed to complete the week
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
 * Modifies an existing program from a specific date forward
 * 
 * This allows users to adjust their program mid-stream without losing
 * historical data. Common use cases:
 * - Increase/decrease training frequency
 * - Change training focus (strength -> cardio)
 * - Adjust schedule due to lifestyle changes
 */
router.post("/:id/change", async (req, res) => {
  try {
    const programId = req.params.id;
    const { effective_date, spec_patch = {}, new_period_weeks = 4 } = req.body || {};
    if (!effective_date) return res.status(400).json({ error: "effective_date required (YYYY-MM-DD)" });

    // Retrieve current program configuration
    const { data: prog, error: progErr } = await supa
      .from("program")
      .select("*")
      .eq("program_id", programId)
      .maybeSingle();
    if (progErr) throw progErr;
    if (!prog) return res.status(404).json({ error: "Program not found" });

    // Merge current settings with requested changes
    const currentSpec = prog.spec_json || {};
    const mergedSpec = {
      ...currentSpec,
      ...spec_patch,
      // Validate and constrain training frequency
      days_per_week: Number.isFinite(Number(spec_patch.days_per_week))
        ? Math.max(1, Math.min(7, Number(spec_patch.days_per_week)))
        : currentSpec.days_per_week ?? 5,
      modalities: Array.isArray(spec_patch.modalities)
        ? spec_patch.modalities
        : currentSpec.modalities ?? ["General"],
      training_days: Array.isArray(spec_patch.training_days)
        ? spec_patch.training_days
        : (currentSpec.training_days ?? null),
      goals: Array.isArray(spec_patch.goals) ? spec_patch.goals : currentSpec.goals ?? [],
      constraints: Array.isArray(spec_patch.constraints)
        ? spec_patch.constraints
        : currentSpec.constraints ?? [],
      spec_version: Number(currentSpec.spec_version ?? 1) + 1, // Track change history
    };

    // 1) Preserve historical data by trimming overlapping period
    // This ensures we don't lose past workout data when making changes
    const eff = new Date(effective_date);
    const dayBefore = new Date(eff);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const dayBeforeISO = dayBefore.toISOString().slice(0, 10);

    // Find any existing period that spans the effective date
    const { data: overlapping, error: ovErr } = await supa
      .from("program_period")
      .select("*")
      .eq("program_id", programId)
      .lte("start_date", effective_date) // Period starts before or on effective date
      .gte("end_date", effective_date)   // Period ends after or on effective date
      .maybeSingle();
    if (ovErr) throw ovErr;

    if (overlapping) {
      // Trim the overlapping period to end the day before changes take effect
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

    // 2) Remove all future periods (they'll be replaced with new content)
    await supa.from("program_period").delete().eq("program_id", programId).gt("start_date", effective_date);

    // 3) Generate new content using updated specifications
    const gen = await buildProgramDaysUniversal({
      plan_type: mergedSpec.agent ?? null,
      weeks: new_period_weeks,
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

    // 4) Apply scheduling rules to new content
    const spacedDays = enforceDaysPerWeek(
      daysArray,
      effective_date,
      mergedSpec.days_per_week ?? 5,
      (mergedSpec as any).training_days ?? null
    );

    // 5) Calculate new end date and save the updated period
    const newEnd = new Date(eff);
    newEnd.setDate(newEnd.getDate() + (spacedDays.length - 1));
    const newEndISO = newEnd.toISOString().slice(0, 10);

    // Determine next period index for proper sequencing
    const { data: existing, error: exErr } = await supa
      .from("program_period")
      .select("period_index")
      .eq("program_id", programId)
      .order("period_index", { ascending: false })
      .limit(1);
    if (exErr) throw exErr;
    const nextIndex = (existing?.[0]?.period_index ?? -1) + 1;

    // Insert the new period with updated content and scheduling
    const { error: insErr } = await supa
      .from("program_period")
      .insert({
        program_id: programId,
        period_index: nextIndex,
        start_date: effective_date,
        end_date: newEndISO,
        period_json: { ...gen, days: spacedDays },
      });
    if (insErr) throw insErr;

    // 6) Save the updated program specifications
    await supa.from("program").update({ spec_json: mergedSpec }).eq("program_id", programId);

    res.json({ ok: true, program_id: programId, effective_date, spec_json: mergedSpec });
  } catch (e: any) {
    console.error("POST /api/programs/:id/change error:", e);
    res.status(500).json({ error: e.message || "unknown error" });
  }
});

/**
 * PATCH /api/programs/:id/periods/:index
 * Allows manual replacement of a specific period's content
 * 
 * This is for advanced users or administrators who want to
 * directly edit training content without AI generation.
 */
router.patch("/:id/periods/:index", async (req, res) => {
  try {
    const programId = req.params.id;
    const periodIndex = Number(req.params.index);
    const days = req.body?.days;
    if (!Array.isArray(days)) return res.status(400).json({ error: "Body must have `days: []`" });

    // Find the specific period to update
    const { data: periodRow, error: perErr } = await supa
      .from("program_period")
      .select("program_period_id, start_date")
      .eq("program_id", programId)
      .eq("period_index", periodIndex)
      .maybeSingle();
    if (perErr) throw perErr;
    if (!periodRow) return res.status(404).json({ error: "Period not found" });

    // Recalculate end date based on new content length
    const start = new Date(String(periodRow.start_date));
    const end = new Date(start);
    end.setDate(end.getDate() + Math.max(0, days.length - 1));

    // Update the period with new content
    const { error: updErr } = await supa
      .from("program_period")
      .update({
        end_date: end.toISOString().slice(0, 10),
        period_json: { days }, // Replace entire content
      })
      .eq("program_period_id", periodRow.program_period_id);
    if (updErr) throw updErr;

    res.json({ ok: true, program_id: programId, period_index: periodIndex, days: days.length });
  } catch (e: any) {
    console.error("PATCH /api/programs/:id/periods/:index error:", e);
    res.status(500).json({ error: e.message || "unknown error" });
  }
});

/**
 * POST /api/programs/:id/extend
 * Generates additional training content when users need more days
 * 
 * This is called automatically when the app detects content gaps
 * or manually when users want to extend their program duration.
 */
router.post("/:id/extend", async (req, res) => {
  try {
    const programId = req.params.id;
    const fromISO = String(req.body?.from || "").slice(0, 10);

    // Allow exact day specification or estimate from weeks
    const requiredDays = Number.isFinite(Number(req.body?.required_days))
      ? Math.max(1, Number(req.body.required_days))
      : null;

    const weeksHint = requiredDays
      ? Math.ceil(requiredDays / 7)
      : Math.max(1, Number(req.body?.weeks_hint || 4));

    if (!fromISO) return res.status(400).json({ error: "from required (YYYY-MM-DD)" });

    // Retrieve program specifications for consistent generation
    const { data: prog, error: progErr } = await supa
      .from("program").select("*").eq("program_id", programId).maybeSingle();
    if (progErr) throw progErr;
    if (!prog) return res.status(404).json({ error: "Program not found" });

    // Ensure we only append forward of existing content
    // This prevents overlaps and maintains chronological order
    const periods = await period.loadPeriods(programId);
    const lastEndISO = periods.length
      ? periods.map((p: any) => p.end_date).reduce((a: string, b: string) => (a > b ? a : b))
      : null;

    if (lastEndISO && fromISO <= lastEndISO) {
      return res.status(400).json({ error: `from (${fromISO}) must be after last end_date (${lastEndISO})` });
    }

    // Generate and append new content
    const appended = await appendPeriodToCover(
      programId,
      fromISO,
      weeksHint,
      prog.spec_json || {},
      requiredDays ?? undefined
    );

    // Keep parent program metadata in sync with latest end date
    await supa.from("program").update({ end_date: appended.end_date }).eq("program_id", programId);

    res.json({ ok: true, appended });
  } catch (e: any) {
    console.error("POST /api/programs/:id/extend error:", e);
    res.status(500).json({ error: e.message || "unknown error" });
  }
});

/**
 * GET /api/programs/:id/window
 * Flexible endpoint for retrieving any range of days (1-60)
 * 
 * This supports various UI views like monthly calendars,
 * custom date ranges, or progress tracking over time.
 */
router.get("/:id/window", async (req, res) => {
  try {
    const programId = req.params.id;
    const startISO = String(req.query.start || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const daysN = Math.max(1, Math.min(60, Number(req.query.days ?? 7))); // Limit to prevent excessive queries

    const periods = await period.loadPeriods(programId);

    // Build requested date range
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

export default router;

