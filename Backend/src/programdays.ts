// backend/src/programdays.ts
import { openai } from "./OpenaiClient";
import { Profiler } from "./profiler";
import { BUILD_PROGRAM_DAYS_PROMPT } from "./prompts/prompt";
import type { AgentType } from "./agents";

/** A single block inside a day. We deliberately keep this open-ended.
 *  (We strip any accidental `kind` field later.) */
export type ProgramBlock = Record<string, unknown>;

export type ProgramDay = {
  notes?: string;
  blocks: ProgramBlock[];
};

export type BuildProgramOptions = {
  /** Canonical agent type from your app (e.g. "Training" | "Nutrition" | "Sleep" | "Mind" | ...). */
  agent: AgentType;
  /** Total weeks to generate (will produce exactly weeks * 7 days). */
  weeks: number;
  /** Optional seed days from elsewhere (will be sanitized and padded/truncated). */
  daysIn?: ProgramDay[];
  /** Optional high-level hints to help the model tailor output. */
  hints?: {
    days_per_week?: number | null;
    modalities?: string[] | null; // e.g. ["BJJ", "Muay Thai"]
    constraints?: string[] | null; // e.g. ["minimal equipment", "home gym"]
    goals?: string[] | null; // e.g. ["strength", "hypertrophy"]
  };
};

/** Keep arrays sized correctly, trim strings, keep blocks as objects, and strip any accidental `kind` field. */
export function sanitizeDaysNoKinds({
  daysIn,
  weeks,
}: {
  daysIn: ProgramDay[] | undefined;
  weeks: number;
}): ProgramDay[] {
  const target = Math.max(1, weeks) * 7;
  const arr: ProgramDay[] = Array.isArray(daysIn)
    ? daysIn.slice(0, target)
    : [];

  while (arr.length < target) {
    arr.push({ notes: `Day ${arr.length + 1}`, blocks: [] });
  }

  return arr.map((d, i): ProgramDay => {
    const notes =
      typeof d?.notes === "string" ? d.notes.slice(0, 120) : `Day ${i + 1}`;

    const blocksIn: unknown[] = Array.isArray(d?.blocks) ? d.blocks : [];
    const blocks: ProgramBlock[] = blocksIn
      .filter(
        (b: unknown): b is ProgramBlock =>
          !!b && typeof b === "object" && !Array.isArray(b)
      )
      .map((b: ProgramBlock) => {
        const out: ProgramBlock = {};
        for (const [k, v] of Object.entries(b as object)) {
          if (typeof k !== "string") continue;
          if (typeof v === "string") out[k] = v.slice(0, 400);
          else if (typeof v === "number" || typeof v === "boolean") out[k] = v;
          else if (v && typeof v === "object") {
            // keep shallow objects if small when stringified
            const json = JSON.stringify(v);
            if (json.length <= 400) out[k] = v;
          }
        }
        // Ensure no `kind` key slips through
        if ("kind" in out) delete (out as any).kind;
        return out;
      });

    return { notes, blocks };
  });
}

/** Ask the LLM to generate days JSON (no `kind`), then sanitize + size to exactly weeks*7. */
export async function buildProgramDaysNoKinds(
  opts: BuildProgramOptions,
  P?: Profiler
): Promise<ProgramDay[]> {
  const { agent, weeks, hints, daysIn } = opts;

  // 1) Call the model with a strict-JSON instruction
  const t0 = process.hrtime.bigint();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0,
    messages: [
      { role: "system", content: BUILD_PROGRAM_DAYS_PROMPT },
      {
        role: "user",
        // keep the "contract" simple & explicit for the model
        content: JSON.stringify(
          {
            agent, // e.g. "Training" | "Nutrition" | "Sleep" | ...
            weeks, // number of weeks
            hints: hints ?? null,
          },
          null,
          0
        ),
      },
    ],
  });
  const t1 = process.hrtime.bigint();
  P?.mark?.("build_program_days_model_done", {
    ms_inner: Number(t1 - t0) / 1_000_000,
  });

  // 2) Parse model output safely
  let rawDays: ProgramDay[] = [];
  try {
    const parsed = JSON.parse(
      completion.choices?.[0]?.message?.content ?? "{}"
    );
    if (parsed && Array.isArray(parsed.days)) {
      rawDays = parsed.days as ProgramDay[];
    }
  } catch {
    rawDays = [];
  }

  // 3) Sanitize & normalize shape and length
  const cleaned = sanitizeDaysNoKinds({ daysIn: rawDays, weeks });
  // If the model returned fewer/more, `sanitizeDaysNoKinds` has already padded/truncated.
  return cleaned;
}
