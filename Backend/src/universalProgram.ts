import { openai } from "./OpenaiClient";

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
          rationale: { type: "string" }
        },
        required: ["plan_type", "cadence_days_per_week"]
      },
      days: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            active: { type: "boolean" },
            notes: { type: "string" },
            intensity: { type: ["string","number"] },
            tags: { type: "array", items: { type: "string" } },
            blocks: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  metrics: {
                    type: "object",
                    additionalProperties: {
                      type: ["string","number","boolean","null"]
                    }
                  }
                },
                required: ["name", "metrics"]
              }
            }
          },
          required: ["active", "notes", "blocks"]
        }
      }
    },
    required: ["metadata", "days"]
  }
} as const;

// --- helpers ---------------------------------------------------------------

function makeRecoveryDay(planType: string) {
  const t = planType.toLowerCase();
  if (t.includes("sleep")) {
    return {
      active: false,
      notes: "Sleep hygiene & recovery",
      intensity: "easy",
      tags: ["recovery","sleep"],
      blocks: [
        {
          name: "Wind-down routine",
          metrics: { time_min: 20, lights_dim: true }
        },
        {
          name: "Consistent bedtime",
          metrics: { bedtime: "22:30", target_hours: 8 }
        },
        {
          name: "Caffeine cutoff",
          metrics: { after_hour: 14 }
        }
      ]
    };
  }
  if (t.includes("nutrition")) {
    return {
      active: false,
      notes: "Nutrition recovery & hydration",
      intensity: "easy",
      tags: ["recovery","nutrition"],
      blocks: [
        { name: "Hydration", metrics: { liters: 2 } },
        { name: "Protein target", metrics: { grams: 120 } },
        { name: "Fiber", metrics: { grams: 30 } }
      ]
    };
  }
  // default training / hybrid
  return {
    active: false,
    notes: "Recovery & mobility",
    intensity: "easy",
    tags: ["recovery","mobility"],
    blocks: [
      { name: "Walk", metrics: { time_min: 20 } },
      { name: "Mobility flow", metrics: { time_min: 10 } },
      { name: "Light breathing", metrics: { time_min: 5 } }
    ]
  };
}

export function normalizeLength<T = any>(days: T[], target: number, planType: string): T[] {
  const out = Array.isArray(days) ? [...days] : [];
  if (out.length === target) return out;

  if (out.length > target) {
    return out.slice(0, target);
  }

  while (out.length < target) {
    // try to insert a recovery day after each 6th item to mimic weekly cadence
    const idx = Math.min(out.length, Math.max(0, out.length - (out.length % 7)));
    const pad = makeRecoveryDay(planType || "Training");
    out.splice(idx, 0, pad as unknown as T);
  }

  // If we overshot (possible with splice strategy), trim back
  return out.slice(0, target);
}

// Ensure each day has the required keys and metrics object shape
function coerceDayShape(day: any) {
  const d: any = { ...day };

  if (typeof d.active !== "boolean") d.active = true;
  if (typeof d.notes !== "string") d.notes = "";
  if (!Array.isArray(d.blocks)) d.blocks = [];

  d.blocks = d.blocks.map((b: any) => {
    const name = typeof b?.name === "string" ? b.name : "Block";
    let metrics = b?.metrics;

    // If the model emitted flat fields (e.g., sets/time_sec), wrap them into metrics
    if (metrics == null || typeof metrics !== "object" || Array.isArray(metrics)) {
      const shallow: any = {};
      for (const k of Object.keys(b || {})) {
        if (k !== "name" && k !== "description" && k !== "metrics") {
          shallow[k] = b[k];
        }
      }
      metrics = Object.keys(shallow).length ? shallow : {};
    }

    return {
      name,
      description: typeof b?.description === "string" ? b.description : undefined,
      metrics
    };
  });

  return d;
}

// --------------------------------------------------------------------------

export async function buildProgramDaysUniversal(args: BuildArgs) {
  const { plan_type, weeks, request_text, hints } = args;
  const totalDays = Math.max(1, Math.min(52, Math.floor(weeks || 1))) * 7;
  const daysPerWeek = Math.max(1, Math.min(7, Math.floor(hints?.days_per_week ?? 5)));

  const system = [
    "You generate structured health/fitness/wellbeing programs as STRICT JSON that matches the provided JSON schema.",
    "Absolutely NO prose, NO markdown, only JSON.",
    `Return exactly ${totalDays} items in "days".`,
    "Spread `active: true` days across each 7-day window according to cadence_days_per_week.",
    "Inactive days should still include helpful lighter/recovery/maintenance content for the declared plan_type (e.g., mobility for training; light walk/hydration for nutrition; wind-down for sleep).",
    "Blocks must have { name, metrics } where metrics is an object (reps, sets, rest_sec, time_min, time_sec, bedtime, waketime, target_hours, calories, liters, etc.).",
    "Never add a field named 'kind'. Keep the schema minimal and flexible."
  ].join("\n");

  const userPayload = {
    request_text,
    plan_type_hint: plan_type ?? null,
    cadence_hint: { days_per_week: daysPerWeek },
    modalities: hints?.modalities ?? null,
    goals: hints?.goals ?? null,
    constraints: hints?.constraints ?? null,
    total_days: totalDays
  };

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_schema", json_schema: JSON_SCHEMA },
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(userPayload) }
    ]
  });

  const raw = completion.choices?.[0]?.message?.content || "{}";
  let parsed: any;

  try {
    parsed = JSON.parse(raw);
  } catch {
    // If the model ever returns non-JSON, fall back to empty shell we can pad
    parsed = { metadata: { plan_type: plan_type || "Training", cadence_days_per_week: daysPerWeek }, days: [] };
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
      rationale: typeof parsed.metadata.rationale === "string" ? parsed.metadata.rationale : undefined
    },
    days: normalized
  };
}
