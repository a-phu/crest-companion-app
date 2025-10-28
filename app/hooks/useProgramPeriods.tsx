import { useCallback, useState } from "react";
import api from "../scripts/axiosClient";
import { TrainingProgram } from "../utils/trainingProgram";
import { ProgramPeriod } from "../utils/programPeriod";

export function useProgramPeriods() {
  const [programIds, setProgramIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [periods, setPeriods] = useState<ProgramPeriod[]>([]);

  const fetchProgramPeriods = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      setError(null);

      const response = await api.get("/messages/programs");
      const programs = TrainingProgram.fromArray(response.data);
      const ids = programs.map((p) => p.program_id);
      setProgramIds(ids);

      const results = await Promise.all(
        ids.map(async (id) => {
          const res = await api.get(`/messages/${id}`);

          const payload = Array.isArray(res.data) ? res.data[0] : res.data;
          return new ProgramPeriod(payload);
        })
      );

      setPeriods(results);
    } catch (err: any) {
      console.error("Failed to fetch program periods:", err);
      setError("Failed to load program periods. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  return {
    periods,
    programIds,
    loading,
    error,
    refreshing,
    fetchProgramPeriods,
    setRefreshing,
  };
}
