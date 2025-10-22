import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import ProgramCard from "./ProgramCard";
import {
  Program,
  ProgramSchedule,
  ProgramType,
  mapPlanTypeToProgramType,
} from "../../utils/program";
import { ProgramPeriod } from "../../utils/programPeriod";
import SectionHeading from "./SectionHeading";
import {
  useFonts,
  Quicksand_300Light,
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
} from "@expo-google-fonts/quicksand";

// export enum ProgramSchedule {
//   Today = "Today",
//   ThisWeek = "ThisWeek",
//   NextWeek = "NextWeek",
// }

// --- Props ---
type ProgramsListProps = {
  programPeriods: ProgramPeriod[];
};

// --- Component ---
const ProgramsList: React.FC<ProgramsListProps> = ({ programPeriods }) => {
  const [fontsLoaded] = useFonts({
    Quicksand_300Light,
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
  });

  if (!fontsLoaded) {
    return <Text>Loading...</Text>;
  }

  // --- Date Helpers ---
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday

  const startOfNextWeek = new Date(endOfWeek);
  startOfNextWeek.setDate(endOfWeek.getDate() + 1);
  const endOfNextWeek = new Date(startOfNextWeek);
  endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);

  // --- Utility ---
  const isSameDay = (a: Date, b: Date): boolean =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  const mapPlanTypeToProgramType = (planType: string): ProgramType => {
    const normalized = planType.toLowerCase();

    if (normalized.includes("train") || normalized.includes("fitness"))
      return ProgramType.Training;
    if (normalized.includes("nutrition") || normalized.includes("diet"))
      return ProgramType.Nutrition;
    if (normalized.includes("cogn") || normalized.includes("focus"))
      return ProgramType.Cognition;
    if (normalized.includes("clinical") || normalized.includes("rehab"))
      return ProgramType.Clinical;
    if (normalized.includes("mind") || normalized.includes("mental"))
      return ProgramType.Mental;
    if (normalized.includes("identity")) return ProgramType.Identity;
    if (normalized.includes("sleep")) return ProgramType.Sleep;
    if (normalized.includes("body") || normalized.includes("physical"))
      return ProgramType.Fitness;

    return ProgramType.Training;
  };

  // --- Flatten all ProgramDays from ProgramPeriods ---
  const allDays = programPeriods.flatMap((period) => {
    const metadata = period.period_json.metadata;
    const moduleType = mapPlanTypeToProgramType(metadata.plan_type);

    return period.period_json.days.map((day) => ({
      ...day,
      moduleType,
      programStartDate: new Date(period.start_date),
    }));
  });

  // --- Categorize by Schedule ---
  const todayPrograms = allDays.filter((day) =>
    isSameDay(new Date(day.date), today)
  );

  const thisWeekPrograms = allDays.filter((day) => {
    const d = new Date(day.date);
    return (
      d >= startOfWeek &&
      d <= endOfWeek &&
      !isSameDay(new Date(day.date), today)
    );
  });

  const nextWeekPrograms = allDays.filter((day) => {
    const d = new Date(day.date);
    return d >= startOfNextWeek && d <= endOfNextWeek;
  });

  // --- Renderer ---
  const renderSection = (
    title: string,
    schedule: ProgramSchedule,
    days: any[]
  ) => (
    <View style={styles.section}>
      <SectionHeading title={title} schedule={schedule} />
      {days.length > 0 ? (
        days.map((day, index) => (
          <ProgramCard
            key={`${schedule}-${index}`}
            moduleType={day.moduleType}
            title={`Day ${day.days_from_today}: ${day.moduleType} Plan`}
            content={Array.isArray(day.blocks) ? day.blocks.join("\n\n") : ""}
          />
        ))
      ) : (
        <Text style={styles.empty}>
          No programs scheduled for {title.toLowerCase()}.
        </Text>
      )}
    </View>
  );

  // --- Render ---
  return (
    <ScrollView>
      {renderSection("Today", ProgramSchedule.Today, todayPrograms)}
      {renderSection("This Week", ProgramSchedule.ThisWeek, thisWeekPrograms)}
      {renderSection("Next Week", ProgramSchedule.NextWeek, nextWeekPrograms)}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 30,
  },
  empty: {
    fontWeight: 400,
    fontSize: 16,
    textAlign: "center",
    color: "#fff",
    fontFamily: "Quicksand_500Medium",
  },
});

export default ProgramsList;
