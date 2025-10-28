import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import ProgramCard from "./ProgramCard";
import { Program, ProgramSchedule, ProgramType } from "../../utils/program";
import SectionHeading from "./SectionHeading";
import {
  useFonts,
  Quicksand_300Light,
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
} from "@expo-google-fonts/quicksand";

const todayPrograms = programs.filter(
  (p) => p.schedule === ProgramSchedule.Today
);
const thisWeekPrograms = programs.filter(
  (p) => p.schedule === ProgramSchedule.ThisWeek
);
const nextWeekPrograms = programs.filter(
  (p) => p.schedule === ProgramSchedule.NextWeek
);

const ProgramsList: React.FC = () => {
  let [fontsLoaded] = useFonts({
    Quicksand_300Light,
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
  });

  if (!fontsLoaded) {
    return <Text>Loading...</Text>;
  }

  return (
    <ScrollView>
      <View style={styles.section}>
        <SectionHeading title={"Today"} schedule={ProgramSchedule.Today} />
        {todayPrograms.length > 0 ? (
          todayPrograms.map((program, index) => (
            <ProgramCard
              key={`today-${index}`}
              moduleType={program.type}
              title={program.title}
              content={program.content}
            />
          ))
        ) : (
          <Text style={styles.empty}>No programs scheduled for today.</Text>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeading
          title={"This Week"}
          schedule={ProgramSchedule.ThisWeek}
        />
        {thisWeekPrograms.length > 0 ? (
          thisWeekPrograms.map((program, index) => (
            <ProgramCard
              key={`week-${index}`}
              moduleType={program.type}
              title={program.title}
              content={program.content}
            />
          ))
        ) : (
          <Text style={styles.empty}>No programs scheduled for this week.</Text>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeading
          title={"Next Week"}
          schedule={ProgramSchedule.NextWeek}
        />
        {nextWeekPrograms.length > 0 ? (
          nextWeekPrograms.map((program, index) => (
            <ProgramCard
              key={`next-${index}`}
              moduleType={program.type}
              title={program.title}
              content={program.content}
            />
          ))
        ) : (
          <Text style={styles.empty}>No programs scheduled for next week.</Text>
        )}
      </View>
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
