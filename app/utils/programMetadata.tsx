export class ProgramMetadata {
  plan_type: string;
  cadence_days_per_week: number;
  rationale?: string;
  start_date: string; // ISO date string

  constructor(data: any) {
    this.plan_type = String(data?.plan_type ?? "Training");
    this.cadence_days_per_week = Number(data?.cadence_days_per_week ?? 5);
    this.start_date = String(
      data?.start_date ?? new Date().toISOString().slice(0, 10)
    );
    this.rationale = data?.rationale ? String(data.rationale) : undefined;
  }

  get startDateObj(): Date {
    return new Date(this.start_date);
  }
}
