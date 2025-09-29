// // backend/src/importance.ts
// import { openai } from "./OpenaiClient";
// import { IMPORTANCE_PROMPT } from "./prompts";

// /** Allowed agent types in your app */
// export const AGENT_TYPES = [
//   "Cognition",
//   "Identity",
//   "Mind",
//   "Clinical",
//   "Nutrition",
//   "Training",
//   "Body",
//   "Sleep",
//   "other",
// ] as const;

// export type AgentType = typeof AGENT_TYPES[number];

// export type ImportanceResult = {
//   important: boolean;
//   agent_type: AgentType; // one of AGENT_TYPES
//   reason?: string;
// };

// /** Runtime guard to coerce/validate agent_type coming back from the model */
// function normalizeAgentType(value: unknown): AgentType {
//   if (typeof value !== "string") return "other";
//   // Accept exact match or case-insensitive match
//   const ix = AGENT_TYPES.findIndex(
//     (t) => t.toLowerCase() === value.toLowerCase()
//   );
//   return ix >= 0 ? AGENT_TYPES[ix] : "other";
// }

// /**
//  * Classify a single message for importance + agent_type.
//  * No heuristics. The model is instructed to map the content to exactly one agent.
//  */
// export async function classifyImportance(content: string): Promise<ImportanceResult> {
//   const input = (content ?? "").slice(0, 2000);

//   const sys =
//     `You are an assistant that classifies ONE chat message.\n` +
//     `Return ONLY strict JSON with keys: important (boolean), agent_type (string), reason (string).\n` +
//     `agent_type MUST be EXACTLY one of:\n` +
//     `${AGENT_TYPES.join(", ")}\n\n` +
//     `Guidance for mapping:\n` +
//     `- Training: workout programming, sets/reps, exercise selection, progression, plans.\n` +
//     `- Nutrition: meals, calories, macros, protein, hydration, diet adjustments.\n` +
//     `- Clinical: injuries, pain, illness, surgery, medications, medical cautions.\n` +
//     `- Body: body composition, measurements, weight changes, soreness (non-clinical), recovery protocols.\n` +
//     `- Sleep: sleep duration/quality, routines, insomnia, jet lag.\n` +
//     `- Mind: stress management, emotions, mindset, motivation tactics.\n` +
//     `- Cognition: focus, attention, memory, mental clarity and performance.\n` +
//     `- Identity: goals/values, self-narrative, long-term identity shifts.\n` +
//     `- other: anything that does not cleanly fit above.\n\n` +
//     `Mark important=true if the message should affect future coaching decisions (e.g., new plan, change of constraints, health issues, strong blockers, deadlines).\n` +
//     `Keep reason ≤ 15 words.`; // short reason for logs

//   try {
//     // const completion = await openai.chat.completions.create({
//     //   model: "gpt-4o-mini",
//     //   response_format: { type: "json_object" },
//     //   messages: [
//     //     { role: "system", content: sys },
//     //     { role: "user", content: input },
//     //   ],
//     //   // no temperature here to keep it deterministic
//     // });
//       const completion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       response_format: { type: "json_object" },
//       messages: [
//         { role: "system", content: IMPORTANCE_PROMPT },
//         { role: "user", content: input },
//       ],
//     });

    

//     const raw = completion.choices?.[0]?.message?.content ?? "{}";
//     const parsed = JSON.parse(raw);

//     const important = !!parsed?.important;
//     const agent_type = normalizeAgentType(parsed?.agent_type);
//     const reason =
//       typeof parsed?.reason === "string"
//         ? String(parsed.reason).slice(0, 120)
//         : "no reason given";

//     return { important, agent_type, reason };
//   } catch (err) {
//     console.error("AI importance classification failed", err);
//     // Minimal fallback: default to "other"
//     return {
//       important: false,
//       agent_type: "other",
//       reason: "fallback",
//     };
//   }
// }

// export default classifyImportance;
// backend/src/importance.ts
// import { openai } from "./OpenaiClient";
// import { IMPORTANCE_PROMPT } from "./prompts";
// import { AGENT_TYPES, AgentType, normalizeAgentType } from "./agents";

// export type ImportanceResult = {
//   important: boolean;
//   agent_type: AgentType;
//   reason?: string;
// };

// export async function classifyImportance(content: string): Promise<ImportanceResult> {
//   const input = (content ?? "").slice(0, 2000);

//   try {
//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       response_format: { type: "json_object" },
//       messages: [
//         { role: "system", content: IMPORTANCE_PROMPT },
//         { role: "user", content: input },
//       ],
//     });

//     const raw = completion.choices?.[0]?.message?.content ?? "{}";
//     const parsed = JSON.parse(raw);

//     const important = !!parsed?.important;
//     const agent_type = normalizeAgentType(parsed?.agent_type);
//     const reason =
//       typeof parsed?.reason === "string" ? String(parsed.reason).slice(0, 120) : "no reason given";

//     return { important, agent_type, reason };
//   } catch (err) {
//     console.error("AI importance classification failed", err);
//     return { important: false, agent_type: "other", reason: "fallback" };
//   }
// }

// export default classifyImportance;
// backend/src/importance.ts
import { openai } from "./OpenaiClient";
import { IMPORTANCE_PROMPT } from "./prompts";
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
