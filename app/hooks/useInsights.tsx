// src/hooks/useInsights.ts
import { useState, useCallback } from "react";
import api from "../scripts/axiosClient";
import { InsightsData } from "../utils/insightsData";

export function useInsights() {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInsights = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);

      const response = await api.get("/insights");

      // ✅ Map response to your InsightsData class
      const mapped = InsightsData.fromJson(response.data);

      setInsights(mapped);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch insights:", err);
      setError("Failed to load insights. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  return {
    insights,
    loading,
    error,
    refreshing,
    setRefreshing,
    fetchInsights,
  };
}
