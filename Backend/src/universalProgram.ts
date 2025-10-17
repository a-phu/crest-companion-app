// Universal Program Generator - AI-powered content creation system
// This module uses OpenAI to generate personalized training, nutrition, and wellness programs

import { openai } from "./OpenaiClient";
import { UNIVERSAL_PROGRAM_SYSTEM_PROMPT } from "./prompts/prompt";

// Input parameters for program generation
export type BuildArgs = {
  plan_type?: string | null; // Agent type hint: "Training", "Sleep", "Nutrition", etc.
  weeks: number;            // Approximate program duration in weeks
  request_text: string;     // User's natural language request
  hints?: {
    days_per_week?: number | null;     // Training frequency (1-7)
    modalities?: string[] | null;      // Training types: ["Strength", "Cardio", "Flexibility"]
    goals?: string[] | null;           // User objectives: ["Weight Loss", "Muscle Gain"]
    constraints?: string[] | null;     // Limitations: ["Lower Back Pain", "No Gym Access"]
  };
};

/**
 * Strict JSON schema for AI model responses
 * 
 * This schema ensures the AI returns properly structured data that our
 * application can reliably parse and use. It enforces:
 * - Required metadata fields
 * - Consistent daily plan structure
 * - Proper data types for all fields
 * - Nested objects for complex data (blocks, metrics)
 */
const JSON_SCHEMA = {
  name: "universal_program_days",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      // Program-level metadata
      metadata: {
        type: "object",
        additionalProperties: false,
        properties: {
          plan_type: { type: "string" },              // "Training", "Nutrition", etc.
          cadence_days_per_week: { type: "integer" }, // Actual frequency chosen by AI
          rationale: { type: "string" }               // AI's reasoning for the program design
        },
        required: ["plan_type", "cadence_days_per_week"]
      },
      // Array of daily plans
      days: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            active: { type: "boolean" },                    // true = training day, false = rest day
            notes: { type: "string" },                      // Daily instructions or motivation
            intensity: { type: ["string", "number"] },      // "Low", "Medium", "High" or 1-10 scale
            tags: { type: "array", items: { type: "string" } }, // ["strength", "upper-body", "beginner"]
            // Structured content blocks (exercises, meals, activities)
            blocks: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: { type: "string" },           // "Push-ups", "Breakfast", "Meditation"
                  description: { type: "string" },    // Detailed instructions
                  metrics: {                          // Quantified parameters
                    type: "object",
                    additionalProperties: {
                      type: ["string", "number", "boolean", "null"]
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

// --- Content generation helpers ---------------------------------------------------------------

/**
 * Creates domain-appropriate recovery day content
 * 
 * Recovery is crucial for all program types but looks different for each:
 * - Training: Light movement, mobility work
 * - Nutrition: Hydration focus, balanced macros  
 * - Sleep: Relaxation routines, sleep hygiene
 * 
 * @param planType - The type of program to create recovery content for
 * @returns A structured recovery day object
 */
function makeRecoveryDay(planType: string) {
  const t = planType.toLowerCase();
  
  if (t.includes("sleep")) {
    return {
      active: false, // Recovery days are typically non-active
      notes: "Sleep hygiene & recovery",
      intensity: "easy",
      tags: ["recovery", "sleep"],
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
          metrics: { after_hour: 14 } // No caffeine after 2 PM
        }
      ]
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
        { name: "Fiber", metrics: { grams: 30 } }
      ]
    };
  }
  
  // Default training/hybrid recovery day
  return {
    active: false,
    notes: "Recovery & mobility",
    intensity: "easy",
    tags: ["recovery", "mobility"],
    blocks: [
      { name: "Walk", metrics: { time_min: 20 } },
      { name: "Mobility flow", metrics: { time_min: 10 } },
      { name: "Light breathing", metrics: { time_min: 5 } }
    ]
  };
}

/**
 * Ensures generated content matches exactly the requested length
 * 
 * AI models can be unpredictable with output length, so this function:
 * - Trims excess content if too long
 * - Adds appropriate recovery days if too short
 * - Maintains weekly structure (7-day cycles)
 * 
 * @param days - Raw AI-generated content array
 * @param target - Exact number of days needed
 * @param planType - Program type for recovery day generation
 * @returns Array with exactly `target` length
 */
export function normalizeLength<T = any>(days: T[], target: number, planType: string): T[] {
  const out = Array.isArray(days) ? [...days] : [];
  if (out.length === target) return out;

  // If we have too much content, trim to target length
  if (out.length > target) {
    return out.slice(0, target);
  }

  // If we need more content, strategically add recovery days
  while (out.length < target) {
    // Insert recovery days at weekly boundaries to maintain natural rhythm
    const idx = Math.min(out.length, Math.max(0, out.length - (out.length % 7)));
    const pad = makeRecoveryDay(planType || "Training");
    out.splice(idx, 0, pad as unknown as T);
  }

  // Safety check: ensure we didn't overshoot due to splice strategy
  return out.slice(0, target);
}

/**
 * Validates and normalizes AI-generated day structure
 * 
 * The AI sometimes returns data in unexpected formats or with missing fields.
 * This function ensures every day has the required structure our app expects.
 * 
 * @param day - Raw day object from AI
 * @returns Properly structured day object
 */
function coerceDayShape(day: any) {
  const d: any = { ...day };

  // Ensure required boolean field exists
  if (typeof d.active !== "boolean") d.active = true;
  if (typeof d.notes !== "string") d.notes = "";
  if (!Array.isArray(d.blocks)) d.blocks = [];

  // Normalize block structure - the AI sometimes puts metrics at the wrong level
  d.blocks = d.blocks.map((b: any) => {
    const name = typeof b?.name === "string" ? b.name : "Block";
    let metrics = b?.metrics;

    // If metrics is malformed, try to extract from flat structure
    if (metrics == null || typeof metrics !== "object" || Array.isArray(metrics)) {
      const shallow: any = {};
      for (const k of Object.keys(b || {})) {
        if (k !== "name" && k !== "description" && k !== "metrics") {
          shallow[k] = b[k]; // Collect flat fields like "sets", "reps", "weight"
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

/**
 * Main AI program generation function
 * 
 * This is the core of our content creation system. It:
 * 1. Constructs a detailed prompt for the AI model
 * 2. Calls OpenAI with structured JSON requirements
 * 3. Validates and normalizes the response
 * 4. Ensures exact length matching
 * 
 * The AI generates contextually appropriate content based on:
 * - Program type (training, nutrition, sleep, etc.)
 * - User goals and constraints  
 * - Requested frequency and duration
 * - Natural language request for personalization
 * 
 * @param args - Complete specification for program generation
 * @returns Structured program with metadata and daily plans
 */
export async function buildProgramDaysUniversal(args: BuildArgs) {
  const { plan_type, weeks, request_text, hints } = args;
  
  // Calculate target parameters with safety bounds
  const totalDays = Math.max(1, Math.min(52, Math.floor(weeks || 1))) * 7; // 1-52 weeks
  const daysPerWeek = Math.max(1, Math.min(7, Math.floor(hints?.days_per_week ?? 5))); // 1-7 days

  // Prepare system prompt with context injection
  const system = UNIVERSAL_PROGRAM_SYSTEM_PROMPT.replace("${totalDays}", String(totalDays));

  // Structure the complete user request for the AI
  const userPayload = {
    request_text,                              // Natural language request
    plan_type_hint: plan_type ?? null,         // Domain guidance
    cadence_hint: { days_per_week: daysPerWeek }, // Frequency preference
    modalities: hints?.modalities ?? null,     // Training types/styles
    goals: hints?.goals ?? null,               // User objectives
    constraints: hints?.constraints ?? null,   // Limitations to consider
    total_days: totalDays                      // Exact length requirement
  };

  // Call OpenAI with structured response requirements
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",           // Fast, capable model for content generation
    temperature: 0.2,               // Low randomness for consistent, professional content
    response_format: { type: "json_schema", json_schema: JSON_SCHEMA }, // Enforce structure
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(userPayload) }
    ]
  });

  // Parse and validate AI response
  const raw = completion.choices?.[0]?.message?.content || "{}";
  let parsed: any;

  try {
    parsed = JSON.parse(raw);
  } catch {
    // Fallback if AI returns malformed JSON (rare but possible)
    parsed = { 
      metadata: { 
        plan_type: plan_type || "Training", 
        cadence_days_per_week: daysPerWeek 
      }, 
      days: [] 
    };
  }

  // Ensure metadata exists and is valid
  if (!parsed?.metadata || typeof parsed.metadata !== "object") {
    parsed.metadata = {};
  }
  if (!parsed.metadata.plan_type) {
    parsed.metadata.plan_type = plan_type || "Training";
  }
  if (!parsed.metadata.cadence_days_per_week) {
    parsed.metadata.cadence_days_per_week = daysPerWeek;
  }

  // Process and normalize the daily content
  const planType = String(parsed.metadata.plan_type || plan_type || "Training");
  const rawDays: any[] = Array.isArray(parsed?.days) ? parsed.days : [];
  
  // Ensure each day has proper structure
  const coerced = rawDays.map(coerceDayShape);
  
  // Guarantee exact length with appropriate padding
  const normalized = normalizeLength(coerced, totalDays, planType);

  // Return complete, validated program
  return {
    metadata: {
      plan_type: planType,
      cadence_days_per_week: parsed.metadata.cadence_days_per_week,
      rationale: typeof parsed.metadata.rationale === "string" ? parsed.metadata.rationale : undefined
    },
    days: normalized
  };
}
