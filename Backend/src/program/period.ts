// This module handles program periods - time-based segments that contain daily training plans
// Periods allow programs to be extended over time without regenerating all historical data

import { supa } from "../supabase";

// ---------- helpers ----------
/**
 * Loads all training periods for a specific program from the database
 *
 * Periods are time-based chunks (e.g., 4-week blocks) that contain daily plans.
 * This design allows for efficient data management and progressive program generation.
 *
 * @param programId - Database ID of the program
 * @returns Array of period objects with start/end dates and daily content
 */
async function loadPeriods(programId: string) {
  const { data, error } = await supa
    .from("program_period")
    .select("period_index,start_date,end_date,period_json")
    .eq("program_id", programId)
    .order("period_index", { ascending: true }); // Chronological order
  if (error) throw error;

  // Transform database rows into working objects with proper Date objects
  return (data ?? []).map((p) => ({
    period_index: p.period_index as number,
    start: new Date(String(p.start_date)), // Convert ISO string to Date for calculations
    end: new Date(String(p.end_date)),
    // Handle both legacy format (array) and current format (object with days array)
    days: Array.isArray((p as any).period_json?.days)
      ? (p as any).period_json.days
      : Array.isArray((p as any).period_json)
      ? (p as any).period_json
      : [],
  }));
}

/**
 * Retrieves the training plan for a specific date
 *
 * This function searches through all periods to find which one contains
 * the requested date, then calculates the correct day index within that period.
 *
 * @param periods - Array of period objects from loadPeriods()
 * @param d - Target date to find plan for
 * @returns The daily plan object, or null if no plan exists for that date
 *
 * Business Logic:
 * - Each period covers a contiguous date range
 * - Day index is calculated from the period start date
 * - Returns null for dates outside all periods (weekends, rest days, future dates)
 */
function dayAt(periods: Array<{ start: Date; end: Date; days: any[] }>, d: Date) {
  for (const per of periods) {
    // Check if the target date falls within this period's range (inclusive)
    if (d >= per.start && d <= per.end) {
      // Calculate which day within the period (0-based index)
      const idx = Math.floor((d.getTime() - per.start.getTime()) / 86400000);
      return per.days[idx] ?? null; // Return the plan or null if index is out of bounds
    }
  }
  return null; // Date not found in any period
}

// Export the utility functions for use by other modules
export default { loadPeriods, dayAt };
