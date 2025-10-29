import { ProgramSchedule, ProgramType } from "./program";
import { v4 as uuidv4 } from "uuid";

export class ProgramPeriod {
  type: string;
  program_period_id: string;
  program_id: string;
  period_index: number;
  start_date: string;
  end_date: string;
  period_json: PeriodJson;
  created_at: string;
  updated_at: string;

  constructor(data: any, type: string) {
    this.type = type;
    this.program_period_id = data.program_period_id;
    this.program_id = data.program_id;
    this.period_index = data.period_index;
    this.start_date = data.start_date;
    this.end_date = data.end_date;
    this.period_json = data.period_json;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // tags: string[];
  // notes: string;
  // title: string;
  // active: boolean;
  // blocks: Block[];
  // intensity: string;
}

// function fromJson(json: any): PeriodJson {
//   if (!json.days || !json.metadata) {
//     throw new Error("Invalid JSON payload for Product");
//   }
//   const days = json.days.map((item) => {
//     return new Day(item);
//   });
//   const metadata = json.metadata.map((item) => {
//     return new Metadata(item);
//   });

//   return new PeriodJson(days, metadata);
// }

export class PeriodJson {
  days: Day[];
  metadata: Metadata;

  constructor(days: Day[], metadata: Metadata) {
    this.days = days.map((day) => {
      return new Day(day, metadata.plan_type);
    });
    this.metadata = metadata;
  }
}

export class Metadata {
  plan_type: ProgramType;
  rationale: string;
  cadence_days_per_week: number;

  constructor(data: any) {
    this.plan_type = data.plan_type;
    this.rationale = data.rationale;
    this.cadence_days_per_week = data.cadence_days_per_week;
  }
}

export class Day {
  tags: string[];
  notes: string;
  title: string;
  active: boolean;
  blocks: string[];
  intensity: string;
  schedule: ProgramSchedule;
  uuid: string;
  date: string;
  planType: string;
  days_from_today: number;

  constructor(data: any, planType: ProgramType) {
    this.tags = data.tags || [];
    this.notes = data.notes;
    this.title = data.title;
    this.active = data.active;
    this.blocks = Array.isArray(data.blocks) ? data.blocks : [];

    this.intensity = data.intensity;
    this.schedule = data.schedule;
    this.uuid = uuidv4();
    this.date = data.date;
    this.planType = planType;
    this.days_from_today = data.days_from_today;
  }
}

export class Block {
  name: string;
  metrics: Metrics;
  description: string;

  constructor(data: any) {
    this.name = data.name;
    this.metrics = new Metrics(data.metrics);
    this.description = data.description;
  }
}

export class Metrics {
  time_min?: number;
  bedtime?: string;

  constructor(data: any) {
    this.time_min = data?.time_min ?? undefined;
    this.bedtime = data?.bedtime ?? undefined;
  }
}
