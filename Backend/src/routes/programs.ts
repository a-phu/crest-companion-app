// import { Router } from "express";
// import { supa } from "../supabase";

// const router = Router();

// /**
//  * POST /api/programs
//  * Body: { user_id: string, type: string, start_date?: string, period_length_weeks?: number, spec_json?: object }
//  * Creates a program and its first period with index-based JSON days.
//  */
// router.post("/", async (req, res) => {
//   try {
//     const { user_id, type, start_date, period_length_weeks = 2, spec_json = {} } = req.body || {};
//     if (!user_id || !type) return res.status(400).json({ error: "user_id and type are required" });

//     const start = start_date ? new Date(start_date) : new Date();
//     const status = start <= new Date() ? "active" : "scheduled";
//     const end = new Date(start);
//     end.setDate(end.getDate() + period_length_weeks * 7 - 1);

//     // 1) Insert program
//     const { data: prog, error: progErr } = await supa
//       .from("program")
//       .insert({
//         user_id,
//         type,
//         status,
//         start_date: start.toISOString().slice(0, 10),
//         end_date: end.toISOString().slice(0, 10),
//         period_length_weeks,
//         spec_json,
//       })
//       .select("*")
//       .single();
//     if (progErr) throw progErr;

//     // 2) Build first period JSON (simple placeholder — replace with your generator later)
//     const days = Array.from({ length: period_length_weeks * 7 }, (_, i) => ({
//       notes: `Day ${i + 1}`,
//       blocks: [
//         { kind: "exercise", name: "Push Ups", sets: 3, reps: "10–12" },
//         { kind: "exercise", name: "Squats", sets: 3, reps: "12–15" },
//       ],
//     }));

//     const { data: period, error: perErr } = await supa
//       .from("program_period")
//       .insert({
//         program_id: prog.program_id,
//         period_index: 0,
//         start_date: prog.start_date,
//         end_date: prog.end_date,
//         period_json: { days },
//       })
//       .select("*")
//       .single();
//     if (perErr) throw perErr;

//     res.json({ program: prog, period });
//   } catch (e: any) {
//     console.error("POST /api/programs error:", e);
//     res.status(500).json({ error: e.message || "unknown error" });
//   }
// });

// /**
//  * GET /api/programs/:id/today
//  * Returns today’s plan from index-based JSON days.
//  */
// router.get("/:id/today", async (req, res) => {
//   try {
//     const programId = req.params.id;
//     const today = new Date().toISOString().slice(0, 10);

//     // Load program
//     const { data: prog, error: progErr } = await supa
//       .from("program")
//       .select("*")
//       .eq("program_id", programId)
//       .maybeSingle();
//     if (progErr) throw progErr;
//     if (!prog) return res.status(404).json({ error: "Program not found" });

//     // Auto-activate if start_date has arrived
//     if (prog.status === "scheduled" && today >= prog.start_date) {
//       await supa.from("program").update({ status: "active" }).eq("program_id", programId);
//       prog.status = "active";
//     }

//     // Find period that covers today
//     const { data: period, error: perErr } = await supa
//       .from("program_period")
//       .select("*")
//       .eq("program_id", programId)
//       .lte("start_date", today)
//       .gte("end_date", today)
//       .maybeSingle();
//     if (perErr) throw perErr;
//     if (!period) return res.status(404).json({ error: "No period covers today" });

//     const idx = Math.floor(
//       (new Date(today).getTime() - new Date(period.start_date).getTime()) / (1000 * 60 * 60 * 24)
//     );
//     const plan = period.period_json?.days?.[idx];

//     res.json({ program: prog, today: { date: today, plan } });
//   } catch (e: any) {
//     console.error("GET /api/programs/:id/today error:", e);
//     res.status(500).json({ error: e.message || "unknown error" });
//   }
// });

// /**
//  * GET /api/programs/:id/week?start=YYYY-MM-DD
//  * Returns a 7-day slice (This Week or Next Week depending on start).
//  */
// router.get("/:id/week", async (req, res) => {
//   try {
//     const programId = req.params.id;
//     const startDate = (req.query.start as string) || new Date().toISOString().slice(0, 10);

//     const { data: period, error: perErr } = await supa
//       .from("program_period")
//       .select("*")
//       .eq("program_id", programId)
//       .lte("start_date", startDate)
//       .gte("end_date", startDate)
//       .maybeSingle();
//     if (perErr) throw perErr;
//     if (!period) return res.status(404).json({ error: "No period covers this week" });

//     const days: Array<{ date: string; plan: any }> = [];
//     for (let i = 0; i < 7; i++) {
//       const d = new Date(startDate);
//       d.setDate(d.getDate() + i);
//       const iso = d.toISOString().slice(0, 10);

//       const idx = Math.floor(
//         (d.getTime() - new Date(period.start_date).getTime()) / (1000 * 60 * 60 * 24)
//       );
//       const plan = period.period_json?.days?.[idx];
//       if (plan) days.push({ date: iso, plan });
//     }

//     res.json({ week_start: startDate, days });
//   } catch (e: any) {
//     console.error("GET /api/programs/:id/week error:", e);
//     res.status(500).json({ error: e.message || "unknown error" });
//   }
// });

// export default router;
// backend/src/routes/programs.ts
import { Router } from "express";
import { supa } from "../supabase";

const router = Router();

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Validate a human user exists
async function assertHuman(humanId: string): Promise<void> {
  if (!UUID_RE.test(humanId)) throw new Error("invalid humanId (not a UUID)");
  const q = await supa
    .from("app_user")
    .select("user_id,user_type")
    .eq("user_id", humanId)
    .maybeSingle();
  if (q.error) throw q.error;
  if (!q.data || q.data.user_type !== "human") {
    throw new Error("humanId not found or not a human user");
  }
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * GET /api/programs/:humanId
 * List all programs for this user
 */
router.get("/:humanId", async (req, res) => {
  try {
    const humanId = String(req.params.humanId);
    await assertHuman(humanId);

    const { data, error } = await supa
      .from("program")
      .select("*")
      .eq("user_id", humanId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    res.json({ programs: data ?? [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "unknown error" });
  }
});

/**
 * GET /api/programs/:humanId/:programId/today
 * Returns today’s plan for this program
 */
router.get("/:humanId/:programId/today", async (req, res) => {
  try {
    const humanId = String(req.params.humanId);
    const programId = String(req.params.programId);
    await assertHuman(humanId);

    const today = iso(new Date());

    // Ensure program belongs to this human
    const { data: prog, error: progErr } = await supa
      .from("program")
      .select("*")
      .eq("program_id", programId)
      .eq("user_id", humanId)
      .maybeSingle();
    if (progErr) throw progErr;
    if (!prog) return res.status(404).json({ error: "Program not found" });

    // Auto-activate if start_date has arrived
    if (prog.status === "scheduled" && today >= prog.start_date) {
      await supa.from("program").update({ status: "active" }).eq("program_id", programId);
      prog.status = "active";
    }

    // Find period covering today
    const { data: period, error: perErr } = await supa
      .from("program_period")
      .select("*")
      .eq("program_id", programId)
      .lte("start_date", today)
      .gte("end_date", today)
      .maybeSingle();
    if (perErr) throw perErr;
    if (!period) return res.status(404).json({ error: "No period covers today" });

    const idx = Math.floor(
      (new Date(today).getTime() - new Date(period.start_date).getTime()) / 86_400_000
    );
    const plan = period.period_json?.days?.[idx];

    res.json({ program: prog, today: { date: today, plan } });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "unknown error" });
  }
});

/**
 * GET /api/programs/:humanId/:programId/week?start=YYYY-MM-DD
 * Returns a 7-day slice of the program
 */
router.get("/:humanId/:programId/week", async (req, res) => {
  try {
    const humanId = String(req.params.humanId);
    const programId = String(req.params.programId);
    await assertHuman(humanId);

    const startDate = (req.query.start as string) || iso(new Date());

    // Ensure program belongs to this human
    const { data: prog, error: progErr } = await supa
      .from("program")
      .select("program_id,user_id")
      .eq("program_id", programId)
      .eq("user_id", humanId)
      .maybeSingle();
    if (progErr) throw progErr;
    if (!prog) return res.status(404).json({ error: "Program not found" });

    // Get the period covering startDate
    const { data: period, error: perErr } = await supa
      .from("program_period")
      .select("*")
      .eq("program_id", programId)
      .lte("start_date", startDate)
      .gte("end_date", startDate)
      .maybeSingle();
    if (perErr) throw perErr;
    if (!period) return res.status(404).json({ error: "No period covers this week" });

    const days: Array<{ date: string; plan: any }> = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const isoDate = iso(d);

      const idx = Math.floor(
        (d.getTime() - new Date(period.start_date).getTime()) / 86_400_000
      );
      const plan = period.period_json?.days?.[idx];
      if (plan) days.push({ date: isoDate, plan });
    }

    res.json({ week_start: startDate, days });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "unknown error" });
  }
});

export default router;
