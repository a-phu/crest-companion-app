export class ProgramDay {
  active: boolean;
  notes: string;
  intensity: string | number;
  tags: string[];
  days_from_today: number;
  date: string; // ISO date string
  blocks: string[]; // markdown strings

  constructor(data: any) {
    this.active = Boolean(data?.active);
    this.notes = String(data?.notes ?? "");
    this.intensity = data?.intensity ?? "moderate";
    this.tags = Array.isArray(data?.tags) ? data.tags.map(String) : [];
    this.days_from_today = Number(data?.days_from_today ?? 0);
    this.date = String(data?.date ?? "");
    this.blocks = Array.isArray(data?.blocks)
      ? data.blocks.map((b: any) => String(b))
      : [];
  }

  /** ISO date → Date object */
  get dateObj(): Date {
    return new Date(this.date);
  }

  /** Example: "Wednesday, Oct 23" */
  get formattedDate(): string {
    return this.dateObj.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }

  /** Whether this day is in the past */
  get isPast(): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.dateObj < today;
  }

  /** Quick summary for debugging/logs */
  toString(): string {
    return `${this.formattedDate} — ${this.notes} (${this.active ? "Active" : "Rest"})`;
  }

  /** Static factory for parsing an array */
  static fromArray(arr: any[]): ProgramDay[] {
    return arr.map((item) => new ProgramDay(item));
  }
}
