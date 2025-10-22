// backend/src/programdays.ts
import { openai } from "./OpenaiClient";
import { Profiler } from "./profiler";
import { BUILD_PROGRAM_DAYS_PROMPT } from "./prompts/prompt";
import type { AgentType } from "./agents";

/** Each block is now Markdown text (no JSON objects). */
export type ProgramBlock = string;

export type ProgramDay = {
  notes?: string;
  blocks: ProgramBlock[]; // Markdown text blocks
};

export type BuildProgramOptions = {
  agent: AgentType;
  weeks: number;
  daysIn?: ProgramDay[];
  hints?: {
    days_per_week?: number | null;
    modalities?: string[] | null;
    constraints?: string[] | null;
    goals?: string[] | null;
  };
};

/** Sanitize Markdown days — trim, pad, and clean up text safely. */
export function sanitizeDaysMarkdown({
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
      .filter((b): b is string => typeof b === "string" && b.trim().length > 0)
      .map((b) => b.slice(0, 2000)); // limit to 2k chars per Markdown block

    return { notes, blocks };
  });
}

/** Ask the LLM to generate Markdown blocks inside days instead of JSON objects. */
export async function buildProgramDaysMarkdown(
  opts: BuildProgramOptions,
  P?: Profiler
): Promise<ProgramDay[]> {
  const { agent, weeks, hints } = opts;

  // 1) Call OpenAI (expect Markdown in `blocks`)
  const t0 = process.hrtime.bigint();
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-nano",
    temperature: 0.7,
    response_format: { type: "text" },
    messages: [
      { role: "system", content: BUILD_PROGRAM_DAYS_PROMPT },
      {
        role: "user",
        content: JSON.stringify({ agent, weeks, hints: hints ?? null }),
      },
    ],
  });
  const t1 = process.hrtime.bigint();
  P?.mark?.("build_program_days_model_done", {
    ms_inner: Number(t1 - t0) / 1_000_000,
  });

  // 2) Try parsing model response
  let rawDays: ProgramDay[] = [];
  try {
    const text = completion.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text);
    if (parsed && Array.isArray(parsed.days))
      rawDays = parsed.days as ProgramDay[];
  } catch {
    rawDays = [];
  }

  // 3) Sanitize & normalize length
  return sanitizeDaysMarkdown({ daysIn: rawDays, weeks });
}
