import { AgentType } from "../agents";

// add
type IntentAction = "create" | "change" | "none";

// update
type IntentParsed = {
  start_date?: string | null;     // YYYY-MM-DD (used as effective_date for changes)
  duration_weeks?: number | null;
  days_per_week?: number | null;
  modalities?: string[] | null;
  // optional cadence hints
  training_days?: ("Mon"|"Tue"|"Wed"|"Thu"|"Fri"|"Sat"|"Sun")[] | null;
};

type IntentResult = {
  should_create: boolean;
  confidence: number;
  agent: AgentType;
  parsed?: IntentParsed;
  action: IntentAction; // <-- add
};
