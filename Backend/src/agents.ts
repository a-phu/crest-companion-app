// backend/src/agents.ts

/** Allowed agent types in your app (single source of truth) */
export const AGENT_TYPES = [
  "Cognition",
  "Identity",
  "Mind",
  "Clinical",
  "Nutrition",
  "Training",
  "Body",
  "Sleep",
  "other",
] as const;

export type AgentType = typeof AGENT_TYPES[number];

/** Normalize any unknown string to a valid AgentType */
export function normalizeAgentType(value: unknown): AgentType {
  if (typeof value !== "string") return "other";
  // Try direct match (case-insensitive)
  const ix = AGENT_TYPES.findIndex(t => t.toLowerCase() === value.toLowerCase());
  if (ix >= 0) return AGENT_TYPES[ix];
  // Try capitalizing first letter (e.g. "mind" -> "Mind")
  const cap = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  const ix2 = AGENT_TYPES.findIndex(t => t === cap);
  return ix2 >= 0 ? AGENT_TYPES[ix2] : "other";
}

/** Lowercased machine key (e.g. "Training" -> "training") */
export function agentKey(a: AgentType): string {
  return a.toLowerCase();
}

/** Internal “type” for the program table (e.g. training.v1) */
export function agentToProgramType(a: AgentType, version = "v1"): string {
  return `${agentKey(a)}.${version}`;
}

/** Which agents can generate programs today? (toggle as you build) */
export function isProgramCapable(a: AgentType): boolean {
  return a !== "other"; // Allow all agent types including "other"
}
