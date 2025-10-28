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
            title: { type: "string" }, // <-- Added title property
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
            schedule: { type: "string" },
          },
          required: [
            "active",
            "notes",
            "blocks",
            "days_from_today",
            "date",
            "schedule",
          ],
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
      title: "Recovery & Sleep",
      active: false,
      notes: "Sleep hygiene & recovery",
      intensity: "easy",
      tags: ["recovery", "sleep"],
      blocks: [
        "### Wind-down Routine\n**Duration:** 20 min **Action:** Dim lights, read a book, or do gentle stretches before bed.",
        "### Consistent Bedtime\n**Target:** 22:30 **Goal:** Aim for 8 hours of quality sleep nightly.",
        "### Caffeine Cutoff\n**Rule:** Avoid caffeine after 14:00 to promote better sleep quality.",
      ],
    };
  }

  if (t.includes("nutrition")) {
    return {
      title: "Nutrition Recovery",
      active: false,
      notes: "Nutrition recovery & hydration",
      intensity: "easy",
      tags: ["recovery", "nutrition"],
      blocks: [
        "### Hydration\n**Goal:** Drink ≈ 2 liters of water today. Herbal teas count toward total.",
        "### Protein Target\n**Goal:** 120 g protein **Examples:** chicken, tofu, Greek yogurt, eggs.",
        "### Fiber Focus\n**Goal:** 30 g fiber **Sources:** oats, beans, vegetables, chia seeds.",
      ],
    };
  }

  // default: training / hybrid / mobility
  return {
    title: "Recovery & Mobility",
    active: false,
    notes: "Recovery & mobility",
    intensity: "easy",
    tags: ["recovery", "mobility"],
    blocks: [
      "### Walk\n**Duration:** 20 min **Goal:** Low-intensity walk to boost circulation.",
      "### Mobility Flow\n**Duration:** 10 min **Focus:** Hips, shoulders, and spine flexibility.",
      "### Light Breathing\n**Duration:** 5 min **Technique:** Box breathing or diaphragmatic breathing for relaxation.",
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

  // while (out.length < target) {
  //   // try to insert a recovery day after each 6th item to mimic weekly cadence
  //   const idx = Math.min(
  //     out.length,
  //     Math.max(0, out.length - (out.length % 7))
  //   );
  //   const pad = makeRecoveryDay(planType || "Training");
  //   out.splice(idx, 0, pad as unknown as T);
  // }

  // If we overshot (possible with splice strategy), trim back
  return out.slice(0, target);
}

// Ensure each day has the required keys and metrics object shape
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

function getWeekdayName(date: Date): string {
  return [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ][date.getUTCDay()];
}

function prependWeekdaysToTitles(days: any[], startDateISO: string): any[] {
  const start = new Date(startDateISO);
  return days.map((day, idx) => {
    const d = new Date(start);
    d.setDate(start.getDate() + idx);
    const weekday = getWeekdayName(d);
    // Remove any existing weekday prefix to avoid duplication
    const title =
      day.title?.replace(
        /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday):\s*/i,
        ""
      ) || "";
    return { ...day, title: `${weekday}: ${title}` };
  });
}

// --------------------------------------------------------------------------

export async function buildProgramDaysUniversal(
  args: BuildArgs & { start_date?: string }
) {
  const { plan_type, weeks, request_text, hints, start_date } = args;
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
    start_date: start_date ?? null, // Pass start date for weekday calculation
  };

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
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
    parsed = {
      metadata: {
        plan_type: plan_type || "Training",
        cadence_days_per_week: daysPerWeek,
        start_date: start_date ?? new Date().toISOString().split("T")[0],
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
  if (!parsed.metadata.start_date) {
    parsed.metadata.start_date =
      start_date ?? new Date().toISOString().split("T")[0];
  }

  // Coerce/normalize days and ensure exact length
  const planType = String(parsed.metadata.plan_type || plan_type || "Training");
  const rawDays: any[] = Array.isArray(parsed?.days) ? parsed.days : [];
  const coerced = rawDays.map((d, i) => coerceDayShape(d, i));
  const normalized = normalizeLength(coerced, totalDays, planType);

  // Add weekday labels if a start_date is given
  let daysWithWeekdays = normalized;
  if (parsed.metadata.start_date) {
    daysWithWeekdays = prependWeekdaysToTitles(
      normalized,
      parsed.metadata.start_date
    );
  }

  // ✅ Final output includes start_date in metadata
  return {
    metadata: {
      plan_type: planType,
      cadence_days_per_week: parsed.metadata.cadence_days_per_week,
      rationale:
        typeof parsed.metadata.rationale === "string"
          ? parsed.metadata.rationale
          : undefined,
      start_date: parsed.metadata.start_date,
    },
    days: daysWithWeekdays,
  };
}
