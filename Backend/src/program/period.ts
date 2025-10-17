import { supa } from "../supabase";

// ---------- helpers ----------
async function loadPeriods(programId: string) {
  const { data, error } = await supa
    .from("program_period")
    .select("period_index,start_date,end_date,period_json")
    .eq("program_id", programId)
    .order("period_index", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((p) => ({
    period_index: p.period_index as number,
    start: new Date(String(p.start_date)),
    end: new Date(String(p.end_date)),
    // period_json may be { metadata, days } or just { days }
    days: Array.isArray((p as any).period_json?.days)
      ? (p as any).period_json.days
      : Array.isArray((p as any).period_json)
      ? (p as any).period_json
      : [],
  }));
}

function dayAt(periods: Array<{ start: Date; end: Date; days: any[] }>, d: Date) {
  for (const per of periods) {
    if (d >= per.start && d <= per.end) {
      const idx = Math.floor((d.getTime() - per.start.getTime()) / 86400000);
      return per.days[idx] ?? null;
    }
  }
  return null;
}

export default { loadPeriods, dayAt };
