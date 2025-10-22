export class TrainingProgram {
  program_id: string;
  user_id: string;
  type: string;
  status: string;
  start_date: string;
  end_date: string;
  period_length_weeks: number;
  spec_json: {
    source: string;
    raw_request: string;
  };
  current_period_index: number;
  created_at: string;
  updated_at: string;

  constructor(data: any) {
    this.program_id = data.program_id;
    this.user_id = data.user_id;
    this.type = data.type;
    this.status = data.status;
    this.start_date = data.start_date;
    this.end_date = data.end_date;
    this.period_length_weeks = data.period_length_weeks;
    this.spec_json = data.spec_json;
    this.current_period_index = data.current_period_index;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Optional helpers
  get id(): string {
    return this.program_id;
  }

  get durationDays(): number {
    const start = new Date(this.start_date);
    const end = new Date(this.end_date);
    return Math.round(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  static fromArray(arr: any[]): TrainingProgram[] {
    return arr.map((item) => new TrainingProgram(item));
  }
}
