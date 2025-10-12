export function sizeDatesFromDays(startISO: string, days: any[]) {
  const start = new Date(startISO);
  const end = new Date(start);
  end.setDate(end.getDate() + Math.max(0, (days?.length || 1) - 1));
  return { startISO, endISO: end.toISOString().slice(0, 10) };
}
export function splitAt(period: { start: string; end: string; days: any[] }, effectiveISO: string) {
  const eff = new Date(effectiveISO);
  const start = new Date(period.start);
  const dayBefore = new Date(eff); dayBefore.setDate(dayBefore.getDate() - 1);
  const trimLen = Math.max(0, Math.floor((dayBefore.getTime() - start.getTime()) / 86400000) + 1);
  return {
    left: { end_date: dayBefore.toISOString().slice(0, 10), days: period.days.slice(0, trimLen) },
  };
}