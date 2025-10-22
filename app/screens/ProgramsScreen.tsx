import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import CrestAppBar from "../components/CrestAppBar";
import SectionHeading from "../components/programs/SectionHeading";
import ProgramsList from "../components/programs/ProgramsList";
import { TrainingProgram } from "../utils/trainingProgram";
import { ProgramPeriod } from "../utils/programPeriod";
import api from "../scripts/axiosClient";
import { useProgramPeriods } from "../hooks/useProgramPeriods";

const ProgramsScreen = ({ isVisible }: { isVisible: boolean }) => {
  const [programIds, setProgramIds] = useState<string[]>([]);
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // const [periods, setPeriods] = useState<ProgramPeriod[]>([]);
  const { periods, loading, error, fetchProgramPeriods } = useProgramPeriods();

  // const fetchPrograms = useCallback(async () => {
  //   try {
  //     if (!refreshing) setLoading(true);
  //     const response = await api.get("/messages/programs");

  //     // Map to class and extract program IDs
  //     const programs = TrainingProgram.fromArray(response.data);
  //     const ids = programs.map((p) => p.program_id);

  //     setProgramIds(ids);
  //     setError(null);
  //   } catch (err: any) {
  //     console.error("Failed to fetch programs:", err);
  //     setError("Failed to load programs. Please try again.");
  //   } finally {
  //     setLoading(false);
  //     setRefreshing(false);
  //   }
  // }, [refreshing]);

  // const fetchProgramPeriods = useCallback(async () => {
  //   try {
  //     setLoading(true);
  //     setError(null);
  //     const response = await api.get("/messages/programs");

  //     // Map to class and extract program IDs
  //     const programs = TrainingProgram.fromArray(response.data);
  //     const ids = programs.map((p) => p.program_id);

  //     setProgramIds(ids);

  //     // Loop through each program_id and call its endpoint
  //     const results = await Promise.all(
  //       ids.map(async (id) => {
  //         const res = await api.get(`/messages/${id}`);
  //         console.log("Raw response for program_id", id, res.data);

  //         // 🧠 Handle both single-object and array responses
  //         const payload = Array.isArray(res.data) ? res.data[0] : res.data;

  //         // 🧩 Debug the type of period_json before creating the class
  //         console.log(
  //           "period_json type:",
  //           typeof payload.period_json,
  //           "value:",
  //           payload.period_json
  //         );

  //         console.log("✅ payload structure:", payload);
  //         console.log("✅ period_json type:", typeof payload.period_json);
  //         return new ProgramPeriod(payload);
  //       })
  //     );
  //     setPeriods(results);

  //     console.log("results: " + results[0]);

  //     // const res = await api.get(
  //     //   `/messages/69f40e58-4b1c-489c-bf24-0b60c9d4ea19`
  //     // );
  //     // console.log("program: " + res.data);
  //     // const period = new ProgramPeriod(res.data);

  //     // setPeriods([period]);
  //   } catch (err: any) {
  //     console.error("Failed to fetch program periods:", err);
  //     setError("Failed to load program periods. Please try again.");
  //   } finally {
  //     setLoading(false);
  //   }
  // }, [programIds]);

  useEffect(() => {
    // fetchPrograms();
    fetchProgramPeriods();
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <CrestAppBar heading={"Programs"} />
        <ProgramsList programPeriods={periods} />
        {/* <View>
          {periods.map((p) => (
            <View key={p.program_period_id}>
              <Text>{`Program ID: ${p.program_id}`}</Text>
              <Text>{`Period Index: ${p.period_index}`}</Text>
              <Text>{`Start: ${p.start_date}`}</Text>
              <Text>{`End: ${p.end_date}`}</Text>
              <Text>First Day Note: {p.period_json.days[0]?.blocks[0]}</Text>
            </View>
          ))}
        </View> */}
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
