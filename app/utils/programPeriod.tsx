// // // Represents the full array element
// export class ProgramPeriod {
//   program_period_id: string;
//   program_id: string;
//   period_index: number;
//   start_date: string;
//   end_date: string;
//   period_json: PeriodJson | null;
//   created_at: string;
//   updated_at: string;

//   constructor(data: any) {
//     this.program_period_id = data.program_period_id;
//     this.program_id = data.program_id;
//     this.period_index = data.period_index;
//     this.start_date = data.start_date;
//     this.end_date = data.end_date;
//     // ✅ Prevent "Cannot read property 'days' of undefined"
//     if (data.period_json && typeof data.period_json === "object") {
//       this.period_json = new PeriodJson(data.period_json);
//     } else {
//       console.warn("⚠️ Missing or invalid period_json for:", data.program_id);
//       this.period_json = null;
//     }

//     this.created_at = data.created_at;
//     this.updated_at = data.updated_at;
//   }
// }

// // Represents the period_json object
// export class PeriodJson {
//   days: ProgramDay[];
//   metadata: ProgramMetadata;

//   constructor(data: any) {
//     this.days = (data.days || []).map((d: any) => new ProgramDay(d));
//     this.metadata = new ProgramMetadata(data.metadata);
//   }
// }

// // Represents each day in the "days" array
// export class ProgramDay {
//   tags: string[];
//   notes: string;
//   active: boolean;
//   blocks: string[];

//   constructor(data: any) {
//     this.tags = data.tags || [];
//     this.notes = data.notes || "";
//     this.active = data.active ?? false;
//     this.blocks = data.blocks || [];
//   }
// }

// // Represents metadata info for the program period
// export class ProgramMetadata {
//   plan_type: string;
//   rationale: string;
//   cadence_days_per_week: number;

//   constructor(data: any) {
//     this.plan_type = data.plan_type;
//     this.rationale = data.rationale;
//     this.cadence_days_per_week = data.cadence_days_per_week;
//   }
// }

// import { ProgramMetadata } from "./programMetadata";
// import { ProgramDay } from "./programDay";
// Represents one complete program period (top-level array item)
// Represents one complete program period (top-level array item)
export class ProgramPeriod {
  agent_type: string;
  program_period_id: string;
  program_id: string;
  period_index: number;
  start_date: string;
  end_date: string;
  period_json: PeriodJson;
  created_at: string;
  updated_at: string;

  constructor(data: any) {
    this.agent_type = data.agent_type;
    this.program_period_id = data.program_period_id;
    this.program_id = data.program_id;
    this.period_index = data.period_index;
    this.start_date = data.start_date;
    this.end_date = data.end_date;

    // Defensive assignment for safety
    if (data.period_json && typeof data.period_json === "object") {
      this.period_json = new PeriodJson(data.period_json);
    } else {
      console.warn("⚠️ Missing or invalid period_json:", data);
      this.period_json = new PeriodJson({});
    }

    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static fromArray(arr: any[]): ProgramPeriod[] {
    return (arr || []).map((item) => new ProgramPeriod(item));
  }
}

// Represents the "period_json" object
export class PeriodJson {
  days: ProgramDay[];
  metadata: ProgramMetadata;

  constructor(data: any) {
    this.days = (data.days || []).map((d: any) => new ProgramDay(d));
    this.metadata = data.metadata
      ? new ProgramMetadata(data.metadata)
      : new ProgramMetadata({});
  }
}

// Represents each training day
export class ProgramDay {
  agent_type: string;
  date: string;
  tags: string[];
  notes: string;
  active: boolean;
  blocks: string[];
  intensity: string;
  days_from_today: number;

  constructor(data: any) {
    this.agent_type = data.agent_type || "other";
    this.date = data.date || "";
    this.tags = data.tags || [];
    this.notes = data.notes || "";
    this.active = data.active ?? false;
    this.blocks = data.blocks || [];
    this.intensity = data.intensity || "none";
    this.days_from_today = data.days_from_today ?? 0;
  }
}

// Represents plan metadata
export class ProgramMetadata {
  plan_type: string;
  rationale: string;
  cadence_days_per_week: number;

  constructor(data: any) {
    this.plan_type = data.plan_type || "";
    this.rationale = data.rationale || "";
    this.cadence_days_per_week = data.cadence_days_per_week ?? 0;
  }
}
