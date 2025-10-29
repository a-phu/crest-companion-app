import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  ImageBackground,
  UIManager,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import CrestAppBar from "../components/CrestAppBar";
import SectionHeading from "../components/programs/SectionHeading";
import ProgramsList from "../components/programs/ProgramsList";
import { ProgramType } from "../utils/program";
import { ProgramPeriod } from "../utils/programPeriod";
import { ProgramSchedule } from "../utils/program";
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
import ProgramCard from "../components/programs/ProgramCard";
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import Markdown from "react-native-markdown-display";
import ProgramCardCollapsed from "../components/programs/ProgramCardCollapsed";

type ProgramCardProps = {
  moduleType: ProgramType;
  title: string;
  content: string; // Markdown string
};

export const programImages: Record<ProgramType, any> = {
  [ProgramType.Fitness]: require("../../assets/programs/fitness-plan.png"),
  [ProgramType.Nutrition]: require("../../assets/programs/nutrition-plan.png"),
  [ProgramType.Cognition]: require("../../assets/programs/cognition-plan.png"),
  [ProgramType.Clinical]: require("../../assets/programs/clinical-plan.png"),
  [ProgramType.Mind]: require("../../assets/programs/mental-plan.png"),
  [ProgramType.Identity]: require("../../assets/programs/identity-plan.png"),
  [ProgramType.Sleep]: require("../../assets/programs/sleep-plan.png"),
  [ProgramType.Training]: require("../../assets/programs/training-plan.png"),
  [ProgramType.Body]: require("../../assets/programs/training-plan.png"),
  [ProgramType.Other]: require("../../assets/programs/training-plan.png"),
};

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
      const response = await api.get("/programs/all-programs");
      const data = response
        ? response.data.map((item: any) => new Program(item))
        : [];
      setPrograms(data);
      // const rawData = {
      //   program_id: "535acebb-7898-4d5c-a22b-9608e03b90da",
      //   user_id: "328a99fe-fa91-4018-9ce2-0ed956b84bcc",
      //   type: "sleep.v1",
      //   status: "scheduled",
      //   start_date: "2025-10-29",
      //   end_date: "2025-11-04",
      //   period_length_weeks: 1,
      //   spec_json: {
      //     agent: "Sleep",
      //     goals: [],
      //     source: "chat",
      //     modalities: ["General"],
      //     constraints: [],
      //     raw_request:
      //       "Make me a plan for improving my sleep to 8 hours for the next week. I am currently sleeping 5-6 hours a night.",
      //     spec_version: 1,
      //     days_per_week: 5,
      //     training_days: null,
      //   },
      //   current_period_index: 0,
      //   created_at: "2025-10-28T11:59:07.141342+00:00",
      //   updated_at: "2025-10-28T11:59:07.141342+00:00",
      // };
      // const program = new Program(rawData);
      // setPrograms([program]);

      const results = await Promise.all(
        programs.map(async (item) => {
          const response = await api.get(`/programs/${item.program_id}`);
          console.log(
            `response data: ${JSON.stringify(response.data.period_json.days, null, 2)}`
          );
          const payload = Array.isArray(response.data)
            ? response.data[0]
            : response.data;
          // console.log(`response data: ${payload}`);

          return new ProgramPeriod(payload, item.type);
        })
      );
      setPeriods(results);
      // const response = await api.get(
      //   `/programs/28cc83ff-be3b-47d9-8b3d-83a9c64e4c07`
      // );
      // const period = new ProgramPeriod(response.data, ProgramType.Nutrition);

      // setPeriods([period]);

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

  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const todayPrograms = periods.flatMap((item) =>
    item.period_json.days
      .filter(
        (day) =>
          // categorizeProgram(day.days_from_today) === ProgramSchedule.Today
          categorizeProgramByDate(day.date) === ProgramSchedule.Today
      )
      .map((day) => ({
        ...day,
        type: item.type,
      }))
  );

  const thisWeekPrograms = periods.flatMap((item) =>
    item.period_json.days
      .filter(
        (day) =>
          // categorizeProgram(day.days_from_today) === ProgramSchedule.ThisWeek
          categorizeProgramByDate(day.date) === ProgramSchedule.ThisWeek
      )
      .map((day) => ({
        ...day,
        type: item.type,
      }))
  );

  const nextWeekPrograms = periods.flatMap((item) =>
    item.period_json.days
      .filter(
        (day) =>
          // categorizeProgram(day.days_from_today) === ProgramSchedule.NextWeek
          categorizeProgramByDate(day.date) === ProgramSchedule.NextWeek
      )
      .map((day) => ({
        ...day,
        type: item.type,
      }))
  );

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
          <SectionHeading title={"Today"} schedule={ProgramSchedule.Today} />
          {todayPrograms.length > 0 ? (
            todayPrograms.map((day) => (
              <ProgramCard
                key={`today-${day.title}`}
                title={day.title}
                content={day.blocks}
                planType={day.type}
              />
            ))
          ) : (
            <Text style={styles.empty}>No programs scheduled for today.</Text>
          )}
          <SectionHeading
            title={"This Week"}
            schedule={ProgramSchedule.ThisWeek}
          />
          {thisWeekPrograms.length > 0 ? (
            thisWeekPrograms.map((day) => (
              <ProgramCardCollapsed
                key={`thisWeek-${day.title}`}
                title={day.title}
              />
            ))
          ) : (
            <Text style={styles.empty}>
              No programs scheduled for this week.
            </Text>
          )}
          <SectionHeading
            title={"Next Week"}
            schedule={ProgramSchedule.NextWeek}
          />
          {nextWeekPrograms.length > 0 ? (
            nextWeekPrograms.map((day) => (
              <ProgramCardCollapsed
                key={`nextWeek-${day.title}`}
                title={day.title}
              />
            ))
          ) : (
            <Text style={styles.empty}>
              No programs scheduled for next week.
            </Text>
          )}
        </ScrollView>
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
  empty: {
    fontWeight: 400,
    fontSize: 16,
    textAlign: "center",
    color: "#fff",
    fontFamily: "Quicksand_500Medium",
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    color: "#425C56",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Quicksand_500Medium",
  },
  heading2: {
    color: "#425C56",
    fontSize: 16,
    fontWeight: 600,
    marginTop: 8,
    marginBottom: 4,
    fontFamily: "Quicksand_600SemiBold",
  },
  bullet_list: {
    marginVertical: 4,
  },
  list_item: {
    flexDirection: "row",
    marginBottom: 4,
  },
});

export function normalizeAgentFromIntent(type: String): ProgramType {
  const programType = type.split(".")[0];

  if (programType === "training") return ProgramType.Training;
  if (programType === "nutrition") return ProgramType.Nutrition;
  if (programType === "sleep") return ProgramType.Sleep;
  if (programType === "mind") return ProgramType.Mind;
  if (programType === "body") return ProgramType.Body;
  if (programType === "clinical") return ProgramType.Clinical;
  if (programType === "cognition") return ProgramType.Cognition;
  if (programType === "identity") return ProgramType.Identity;
  return ProgramType.Other;
}

export function categorizeProgram(daysFromToday: number): ProgramSchedule {
  if (daysFromToday === 0) return ProgramSchedule.Today;

  const today = new Date();
  const currentDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...

  // compute offset so Monday = start of this week
  const daysSinceMonday = (currentDayOfWeek + 6) % 7; // makes Monday=0, Sunday=6

  const startOfThisWeek = 0 - daysSinceMonday; // days offset from today
  const endOfThisWeek = 6 - daysSinceMonday;
  const endOfNextWeek = endOfThisWeek + 7;

  if (daysFromToday >= startOfThisWeek && daysFromToday <= endOfThisWeek) {
    return ProgramSchedule.ThisWeek;
  } else if (daysFromToday > endOfThisWeek && daysFromToday <= endOfNextWeek) {
    return ProgramSchedule.NextWeek;
  } else {
    return ProgramSchedule.Future;
  }
}

export function categorizeProgramByDate(dateISO: string): ProgramSchedule {
  const today = new Date();
  const programDate = new Date(dateISO);

  // Calculate difference in days between program date and today
  const diffTime = programDate.getTime() - today.setHours(0, 0, 0, 0);
  const daysFromToday = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (daysFromToday === 0) {
    return ProgramSchedule.Today;
  }

  const currentDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...
  const daysSinceMonday = (currentDayOfWeek + 6) % 7; // Monday=0, Sunday=6

  const startOfThisWeek = -daysSinceMonday;
  const endOfThisWeek = 6 - daysSinceMonday;
  const endOfNextWeek = endOfThisWeek + 7;

  if (daysFromToday >= startOfThisWeek && daysFromToday <= endOfThisWeek) {
    return ProgramSchedule.ThisWeek;
  } else if (daysFromToday > endOfThisWeek && daysFromToday <= endOfNextWeek) {
    return ProgramSchedule.NextWeek;
  } else {
    return ProgramSchedule.Future;
  }
}
