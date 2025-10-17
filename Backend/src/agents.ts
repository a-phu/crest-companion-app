// backend/src/agents.ts
// This module defines the AI agent system that powers different types of programs
// Each agent specializes in a specific domain (training, nutrition, sleep, etc.)

/** 
 * Comprehensive list of AI agent types supported by the platform
 * 
 * Each agent represents a specialized domain with its own:
 * - Content generation capabilities
 * - Domain-specific knowledge
 * - Tailored prompts and logic
 * 
 * This is the single source of truth for all agent types across the application.
 */
export const AGENT_TYPES = [
  "Cognition",   // Mental performance, focus, cognitive training
  "Identity",    // Personal development, self-improvement
  "Mind",        // Mental health, mindfulness, stress management
  "Clinical",    // Medical protocols, rehabilitation
  "Nutrition",   // Diet plans, meal planning, nutritional guidance
  "Training",    // Exercise programs, workout routines, fitness
  "Body",        // Physical therapy, movement, flexibility
  "Sleep",       // Sleep optimization, sleep hygiene protocols
  "other",       // Catch-all for unrecognized or hybrid approaches
] as const;

// TypeScript type for compile-time safety and autocomplete
export type AgentType = typeof AGENT_TYPES[number];

/** 
 * Safely converts any input to a valid AgentType
 * 
 * This function handles user input, API calls, and database values that
 * might contain invalid or malformed agent type strings.
 * 
 * @param value - Any input that might represent an agent type
 * @returns A guaranteed valid AgentType, defaulting to "other" if invalid
 */
export function normalizeAgentType(value: unknown): AgentType {
  if (typeof value !== "string") return "other";
  
  // Case-insensitive matching for user-friendly input handling
  const ix = AGENT_TYPES.findIndex(t => t.toLowerCase() === value.toLowerCase());
  return ix >= 0 ? AGENT_TYPES[ix] : "other";
}

/** 
 * Converts AgentType to lowercase machine key for internal use
 * 
 * Used for database keys, file paths, API endpoints, etc.
 * Example: "Training" -> "training"
 */
export function agentKey(a: AgentType): string {
  return a.toLowerCase();
}

/** 
 * Generates internal program type identifier for database storage
 * 
 * Format: "{agent_key}.{version}" (e.g., "training.v1", "nutrition.v1")
 * This allows for versioning of different agent capabilities over time.
 */
export function agentToProgramType(a: AgentType, version = "v1"): string {
  return `${agentKey(a)}.${version}`;
}

/** 
 * Determines which agents can currently generate full programs
 * 
 * This feature flag system allows gradual rollout of new agent capabilities.
 * As new agents are developed and tested, they can be enabled here.
 * 
 * Currently supported:
 * - Training: Workout routines, exercise programs
 * - Nutrition: Meal plans, dietary guidance  
 * - Sleep: Sleep schedules, optimization protocols
 * 
 * @param a - The agent type to check
 * @returns true if this agent can generate complete programs
 */
export function isProgramCapable(a: AgentType): boolean {
  const k = agentKey(a);
  return k === "training" || k === "nutrition" || k === "sleep";
}
