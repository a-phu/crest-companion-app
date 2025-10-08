// backend/src/profiler.ts
import { randomUUID } from "crypto";

export type Mark = { label: string; t: bigint; extra?: Record<string, any> };

export class Profiler {
  id = randomUUID();
  marks: Mark[] = [];
  start = process.hrtime.bigint();

  mark(label: string, extra?: Record<string, any>) {
    this.marks.push({ label, t: process.hrtime.bigint(), extra });
  }

  // ms between two bigints
  private ms(a: bigint, b: bigint) { return Number(b - a) / 1_000_000; }

  report() {
    const out: Array<{ step: string; ms: number; extra?: Record<string, any> }> = [];
    let prev = this.start;
    for (const m of this.marks) {
      out.push({ step: m.label, ms: this.ms(prev, m.t), extra: m.extra });
      prev = m.t;
    }
    out.push({ step: "TOTAL", ms: this.ms(this.start, prev) });
    return out;
  }
}
