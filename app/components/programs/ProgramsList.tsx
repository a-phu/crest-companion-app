import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import ProgramCard from "./ProgramCard";
import ProgramCardCollapsed from "./ProgramCardCollapsed";
import { Program, ProgramSchedule, ProgramType } from "../../utils/program";
import SectionHeading from "./SectionHeading";
import {
  useFonts,
  Quicksand_300Light,
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
} from "@expo-google-fonts/quicksand";
import { ProgramPeriod } from "../../utils/programPeriod";

type ProgramsListProps = {
  programPeriods: ProgramPeriod[];
};

const ProgramsList: React.FC<ProgramsListProps> = ({ programPeriods }) => {
  let [fontsLoaded] = useFonts({
    Quicksand_300Light,
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
  });

  if (!fontsLoaded) {
    return <Text>Loading...</Text>;
  }

  const todayPrograms = programPeriods.map((period) =>
    period.period_json.days.filter(
      (day) => day.schedule === ProgramSchedule.Today
    )
  );
  const thisWeekPrograms = programPeriods.map((period) =>
    period.period_json.days.filter(
      (day) => day.schedule === ProgramSchedule.ThisWeek
    )
  );
  const nextWeekPrograms = programPeriods.map((period) =>
    period.period_json.days.filter(
      (day) => day.schedule === ProgramSchedule.NextWeek
    )
  );

  return (
    <View>
      <View style={styles.section}>
        <SectionHeading title={"Today"} schedule={ProgramSchedule.Today} />

        {todayPrograms.length > 0 ? (
          todayPrograms.map((day, index) => (
            <ProgramCard
              key={`today-${index}`}
              moduleType={day[0].planType}
              title={day[0].title}
              content={day[0].blocks}
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
          thisWeekPrograms.map((day, index) => (
            // <ProgramCard
            //   key={`today-${index}`}
            //   moduleType={day[0].planType}
            //   title={day[0].title}
            //   content={day[0].blocks}
            // />
            <ProgramCardCollapsed
              key={`today-${index}`}
              moduleType={day[0].planType}
              title={day[0].title}
              content={day[0].blocks}
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
          nextWeekPrograms.map((day, index) => (
            // <ProgramCard
            //   key={`today-${index}`}
            //   moduleType={day[0].planType}
            //   title={day[0].title}
            //   content={day[0].blocks}
            // />
            <ProgramCardCollapsed
              key={`today-${index}`}
              moduleType={day[0].planType}
              title={day[0].title}
              content={day[0].blocks}
            />
          ))
        ) : (
          <Text style={styles.empty}>No programs scheduled for next week.</Text>
        )}
      </View>
    </View>
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
