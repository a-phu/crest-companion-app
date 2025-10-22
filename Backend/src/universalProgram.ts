import { openai } from "./OpenaiClient";
import { UNIVERSAL_PROGRAM_SYSTEM_PROMPT } from "./prompts/prompt";

export type BuildArgs = {
  plan_type?: string | null; // e.g. "Training", "Sleep", "Nutrition", "Hybrid", ...
  weeks: number;
  request_text: string;
  hints?: {
    days_per_week?: number | null;
    modalities?: string[] | null;
    goals?: string[] | null;
    constraints?: string[] | null;
  };
};

const JSON_SCHEMA = {
  name: "universal_program_days",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      metadata: {
        type: "object",
        additionalProperties: false,
        properties: {
          plan_type: { type: "string" },
          cadence_days_per_week: { type: "integer" },
          rationale: { type: "string" },
          start_date: {
            type: "string",
            format: "date",
            description:
              "The ISO start date for the first day of the program (e.g., 2025-10-22).",
          },
        },
        required: ["plan_type", "cadence_days_per_week", "start_date"],
      },
      days: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            active: { type: "boolean" },
            notes: { type: "string" },
            intensity: { type: ["string", "number"] },
            tags: { type: "array", items: { type: "string" } },

            // 🆕 Scheduling fields
            days_from_today: {
              type: "integer",
              description:
                "Number of days from today this program day is scheduled for. 0 = today, 1 = tomorrow, etc.",
            },
            date: {
              type: "string",
              format: "date",
              description:
                "Exact ISO date for this program day, derived from start_date + days_from_today.",
            },

            // Markdown-based blocks
            blocks: {
              type: "array",
              description:
                "Each item is a Markdown-formatted string describing a workout, habit, or routine block.",
              items: {
                type: "string",
                description:
                  "Markdown text (e.g., '### Bench Press\\n**Sets:** 3 | **Reps:** 8–10 | **Rest:** 90s')",
              },
            },
          },
          required: ["active", "notes", "blocks", "days_from_today", "date"],
        },
      },
    },
    required: ["metadata", "days"],
  },
} as const;

// --- helpers ---------------------------------------------------------------

function makeRecoveryDay(planType: string) {
  const t = planType.toLowerCase();
  if (t.includes("sleep")) {
    return {
      active: false,
      notes: "Sleep hygiene & recovery",
      intensity: "easy",
      tags: ["recovery", "sleep"],
      blocks: [
        {
          name: "Wind-down routine",
          metrics: { time_min: 20, lights_dim: true },
        },
        {
          name: "Consistent bedtime",
          metrics: { bedtime: "22:30", target_hours: 8 },
        },
        {
          name: "Caffeine cutoff",
          metrics: { after_hour: 14 },
        },
      ],
    };
  }
  if (t.includes("nutrition")) {
    return {
      active: false,
      notes: "Nutrition recovery & hydration",
      intensity: "easy",
      tags: ["recovery", "nutrition"],
      blocks: [
        { name: "Hydration", metrics: { liters: 2 } },
        { name: "Protein target", metrics: { grams: 120 } },
        { name: "Fiber", metrics: { grams: 30 } },
      ],
    };
  }
  // default training / hybrid
  return {
    active: false,
    notes: "Recovery & mobility",
    intensity: "easy",
    tags: ["recovery", "mobility"],
    blocks: [
      { name: "Walk", metrics: { time_min: 20 } },
      { name: "Mobility flow", metrics: { time_min: 10 } },
      { name: "Light breathing", metrics: { time_min: 5 } },
    ],
  };
}

export function normalizeLength<T = any>(
  days: T[],
  target: number,
  planType: string
): T[] {
  const out = Array.isArray(days) ? [...days] : [];
  if (out.length === target) return out;

  if (out.length > target) {
    return out.slice(0, target);
  }

  while (out.length < target) {
    // try to insert a recovery day after each 6th item to mimic weekly cadence
    const idx = Math.min(
      out.length,
      Math.max(0, out.length - (out.length % 7))
    );
    const pad = makeRecoveryDay(planType || "Training");
    out.splice(idx, 0, pad as unknown as T);
  }

  // If we overshot (possible with splice strategy), trim back
  return out.slice(0, target);
}

function coerceDayShape(day: any) {
  const d: any = { ...day };

  if (typeof d.active !== "boolean") d.active = true;
  if (typeof d.notes !== "string") d.notes = "";
  if (!Array.isArray(d.blocks)) d.blocks = [];

  // ✅ Ensure each block is a Markdown string
  d.blocks = d.blocks
    .filter((b: any) => typeof b === "string")
    .map((b: string) => b.slice(0, 2000)); // limit length

  return d;
}
// --------------------------------------------------------------------------

export async function buildProgramDaysUniversal(args: BuildArgs) {
  const { plan_type, weeks, request_text, hints } = args;
  const totalDays = Math.max(1, Math.min(52, Math.floor(weeks || 1))) * 7;
  const daysPerWeek = Math.max(
    1,
    Math.min(7, Math.floor(hints?.days_per_week ?? 5))
  );

  const system = UNIVERSAL_PROGRAM_SYSTEM_PROMPT.replace(
    "${totalDays}",
    String(totalDays)
  );

  const userPayload = {
    request_text,
    plan_type_hint: plan_type ?? null,
    cadence_hint: { days_per_week: daysPerWeek },
    modalities: hints?.modalities ?? null,
    goals: hints?.goals ?? null,
    constraints: hints?.constraints ?? null,
    total_days: totalDays,
  };

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.2,
    response_format: { type: "json_schema", json_schema: JSON_SCHEMA },
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(userPayload) },
    ],
  });

  const raw = completion.choices?.[0]?.message?.content || "{}";
  let parsed: any;

  try {
    parsed = JSON.parse(raw);
  } catch {
    // If the model ever returns non-JSON, fall back to empty shell we can pad
    parsed = {
      metadata: {
        plan_type: plan_type || "Training",
        cadence_days_per_week: daysPerWeek,
      },
      days: [],
    };
  }

  // Ensure required metadata fields exist
  if (!parsed?.metadata || typeof parsed.metadata !== "object") {
    parsed.metadata = {};
  }
  if (!parsed.metadata.plan_type) {
    parsed.metadata.plan_type = plan_type || "Training";
  }
  if (!parsed.metadata.cadence_days_per_week) {
    parsed.metadata.cadence_days_per_week = daysPerWeek;
  }

  // Coerce/normalize days and ensure exact length
  const planType = String(parsed.metadata.plan_type || plan_type || "Training");
  const rawDays: any[] = Array.isArray(parsed?.days) ? parsed.days : [];
  const coerced = rawDays.map(coerceDayShape);
  const normalized = normalizeLength(coerced, totalDays, planType);

  // Final output
  return {
    metadata: {
      plan_type: planType,
      cadence_days_per_week: parsed.metadata.cadence_days_per_week,
      rationale:
        typeof parsed.metadata.rationale === "string"
          ? parsed.metadata.rationale
          : undefined,
    },
    days: normalized,
  };
}
