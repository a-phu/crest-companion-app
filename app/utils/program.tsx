// Defines the allowed program types
// Program type mapping:
// - **Training:** workout programming, sets/reps, exercise selection, progression, or sport-specific plans (e.g. “strength plan”, “running program”, “BJJ conditioning”).
// - **Nutrition:** diet plans, calorie targets, macros, hydration, supplements, or meal structure.
// - **Clinical:** injuries, illness, pain management, surgery recovery, medications, or medically supervised routines.
// - **Body:** body composition goals, weight changes, soreness (non-clinical), mobility, or recovery protocols.
// - **Sleep:** sleep hygiene, insomnia solutions, bedtime routines, or improving rest/jet lag.
// - **Mind:** mindset, emotions, motivation, resilience, or stress management routines.
// - **Cognition:** focus, memory, concentration, attention, or mental clarity improvement programs.
// - **Identity:** long-term goals, values, self-concept, life direction, or transformation of habits and personal narrative.
// - **other:** anything that does not fit the above domains cleanly.
//i want to use program_id from Program to use axios to call an api endpoint "/periods/program_id" which will return

export enum ProgramType {
  Fitness = "fitness",
  Nutrition = "nutrition",
  Cognition = "cognition",
  Clinical = "clinical",
  Mind = "mind",
  Identity = "identity",
  Sleep = "sleep",
  Training = "training",
  Body = "body",
  Other = "other",
}

// Defines when the program is scheduled
export enum ProgramSchedule {
  Today = "today",
  ThisWeek = "this_week",
  NextWeek = "next_week",
}

// export class Program {
//   constructor(
//     public type: ProgramType,
//     public title: string,
//     public schedule: ProgramSchedule,
//     public content: string // markdown text
//   ) {}
// }

export class Program {
  program_id: string;
  user_id: string;
  type: ProgramType;
  status: string;
  start_date: string;
  end_date: string;
  period_length_weeks: number;
  spec_json: ProgramSpec;
  current_period_index: number;
  created_at: string;
  updated_at: string;

  constructor(data: any) {
    this.program_id = data.program_id;
    this.user_id = data.user_id;

    this.type = normalizeAgentFromIntent(data.type);

    this.status = data.status;
    this.start_date = data.start_date;
    this.end_date = data.end_date;
    this.period_length_weeks = data.period_length_weeks;
    this.spec_json = new ProgramSpec(data.spec_json);
    this.current_period_index = data.current_period_index;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }
}

export class ProgramSpec {
  agent: string;
  goals: string[];
  source: string;
  modalities: string[];
  constraints: string[];
  raw_request: string;
  spec_version: number;
  days_per_week: number;
  training_days: string[] | null;

  constructor(data: any) {
    this.agent = data.agent;
    this.goals = data.goals || [];
    this.source = data.source;
    this.modalities = data.modalities || [];
    this.constraints = data.constraints || [];
    this.raw_request = data.raw_request;
    this.spec_version = data.spec_version;
    this.days_per_week = data.days_per_week;
    this.training_days = data.training_days;
  }
}

function normalizeAgentFromIntent(type: String): ProgramType {
  const programType = type.toLowerCase().split(".")[0];

  if (programType === "training") return ProgramType.Training;
  if (programType === "nutrition") return ProgramType.Nutrition;
  if (programType === "sleep") return ProgramType.Sleep;
  if (programType === "mind") return ProgramType.Mind;
  if (programType === "body") return ProgramType.Body;
  if (programType === "clinical") return ProgramType.Clinical;
  if (programType === "cognition") return ProgramType.Cognition;
  if (programType === "identity") return ProgramType.Identity;
  return ProgramType.Other;
}
