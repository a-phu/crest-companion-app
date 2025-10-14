// backend/src/importance.ts
import { openai } from "./OpenaiClient";
import { IMPORTANCE_PROMPT } from "./prompts/prompt";
import { AGENT_TYPES, type AgentType } from "./agents";

export type ImportanceResult = {
  important: boolean;
  agent_type: AgentType; // one of AGENT_TYPES
  reason?: string;
};

/** Coerce/validate agent_type coming back from the model */
function normalizeAgentType(value: unknown): AgentType {
  if (typeof value !== "string") return "other";
  const ix = AGENT_TYPES.findIndex((t) => t.toLowerCase() === value.toLowerCase());
  return ix >= 0 ? AGENT_TYPES[ix] : "other";
}

/** Classify a single message for importance + agent_type (strict JSON). */
export async function classifyImportance(content: string): Promise<ImportanceResult> {
  const input = (content ?? "").slice(0, 2000);
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: IMPORTANCE_PROMPT },
        { role: "user", content: input },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    const important = !!parsed?.important;
    const agent_type = normalizeAgentType(parsed?.agent_type);
    const reason =
      typeof parsed?.reason === "string"
        ? String(parsed.reason).slice(0, 120)
        : "no reason given";

    return { important, agent_type, reason };
  } catch (err) {
    console.error("AI importance classification failed", err);
    return { important: false, agent_type: "other", reason: "fallback" };
  }
}

export default classifyImportance;
