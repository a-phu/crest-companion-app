// backend/src/prompts.ts
import { AGENT_TYPES } from "../agents";

export const PROGRAM_INTENT_PROMPT =
  `You are an intent detector for program creation.
Return STRICT JSON with keys:
- should_create (boolean)
- confidence (number 0..1)
- agent_type (string)  // MUST be exactly one of: ${AGENT_TYPES.join(", ")}
- parsed (object) with optional keys: start_date (YYYY-MM-DD), duration_weeks (int), days_per_week (int), modalities (array of strings)

Rules:
- should_create=true only if the user is clearly asking to make a plan/program.
- Choose agent_type that best matches the program domain (Training, Nutrition, or Sleep). Use "other" if unclear.
- confidence reflects how certain you are that a plan is requested.

Example good output:
{"should_create":true,"confidence":0.83,"agent_type":"Training","parsed":{"duration_weeks":8,"days_per_week":4}}`;
