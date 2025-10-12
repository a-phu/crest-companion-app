export function enforceCadence(days: any[], daysPerWeek: number, preferIdx: number[] = []) {
  if (!Array.isArray(days) || !Number.isFinite(daysPerWeek)) return days;
  const out = [...days];

  for (let w = 0; w * 7 < out.length; w++) {
    const s = w * 7, e = Math.min(out.length, s + 7); // [s,e)
    const idxs = Array.from({ length: e - s }, (_, i) => s + i);
    const active = idxs.filter(i => out[i]?.plan?.active === true);

    if (active.length <= daysPerWeek) continue;

    // Keep preferred weekdays first (e.g. Mon/Wed/Fri = [0,2,4])
    const rel = (i: number) => i - s;
    const preferred = preferIdx
      .map(p => s + p)
      .filter(i => i >= s && i < e && out[i]?.plan?.active === true);

    const keepSet = new Set<number>();
    for (const i of preferred) {
      if (keepSet.size < daysPerWeek) keepSet.add(i);
    }
    for (const i of active) {
      if (keepSet.size < daysPerWeek) keepSet.add(i);
    }

    // Flip the rest to inactive
    for (const i of active) {
      if (!keepSet.has(i)) out[i] = { ...(out[i] || {}), plan: { ...(out[i]?.plan || {}), active: false } };
    }
  }
  return out;
}
