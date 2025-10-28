import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import CrestAppBar from "../components/CrestAppBar";
import SectionHeading from "../components/programs/SectionHeading";
import ProgramsList from "../components/programs/ProgramsList";
import { ProgramType } from "../utils/program";
import { ProgramPeriod } from "../utils/programPeriod";
import { Program } from "../utils/program";
import api from "../scripts/axiosClient";
import {
  useFonts,
  Quicksand_300Light,
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
} from "@expo-google-fonts/quicksand";
import { v4 as uuidv4 } from "uuid";

const ProgramsScreen = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [periods, setPeriods] = useState<ProgramPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  let [fontsLoaded] = useFonts({
    Quicksand_300Light,
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
  });

  const fetchPrograms = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      const response = await api.get("/programs/all-programs");
      const data = response
        ? response.data.map((item: any) => new Program(item))
        : [];
      setPrograms(data);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch programs:", err);
      setError("Failed to load programs. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  const fetchPeriods = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      // const response = await api.get("/programs/all-programs");
      // const data = response
      //   ? response.data.map((item: any) => new Program(item))
      //   : [];
      // setPrograms(data);
      const rawData = {
        program_id: "535acebb-7898-4d5c-a22b-9608e03b90da",
        user_id: "328a99fe-fa91-4018-9ce2-0ed956b84bcc",
        type: "sleep.v1",
        status: "scheduled",
        start_date: "2025-10-29",
        end_date: "2025-11-04",
        period_length_weeks: 1,
        spec_json: {
          agent: "Sleep",
          goals: [],
          source: "chat",
          modalities: ["General"],
          constraints: [],
          raw_request:
            "Make me a plan for improving my sleep to 8 hours for the next week. I am currently sleeping 5-6 hours a night.",
          spec_version: 1,
          days_per_week: 5,
          training_days: null,
        },
        current_period_index: 0,
        created_at: "2025-10-28T11:59:07.141342+00:00",
        updated_at: "2025-10-28T11:59:07.141342+00:00",
      };
      const program = new Program(rawData);
      // setPrograms([program]);

      // const results = await Promise.all(
      //   programs.map(async (item) => {
      //     const response = await api.get(`/programs/${item.program_id}`);
      //     console.log(
      //       `response data: ${JSON.stringify(response.data.period_json.days, null, 2)}`
      //     );
      //     const payload = Array.isArray(response.data)
      //       ? response.data[0]
      //       : response.data;
      //     // console.log(`response data: ${payload}`);

      //     return new ProgramPeriod(payload, item.type);
      //   })
      // );

      const response = await api.get(
        `/programs/1ad861f0-3bf9-4623-b27f-dd4c20e9d78a`
      );
      const period = new ProgramPeriod(response.data, ProgramType.Sleep);

      setPeriods([period]);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch programs:", err);
      setError("Failed to load programs. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    if (fontsLoaded) {
      fetchPeriods();
    }
  }, [fontsLoaded, fetchPrograms]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPeriods();
  }, [fetchPrograms]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <CrestAppBar heading={"Your Plans"} subtitle={""} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {periods.map((item, idx) =>
            item.period_json.days.map((day, idx) => (
              <Text key={day.title}>
                program id: {item.program_id}, type: {item.type}, day title:{" "}
                {day.title}, day schedule: {day.schedule}
              </Text>
            ))
          )}
        </ScrollView>
        {/* <ProgramsList /> */}
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default ProgramsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 20,
    marginBottom: 20,
  },
  contentContainer: {
    flexDirection: "column",
    flex: 1,
  },
});
