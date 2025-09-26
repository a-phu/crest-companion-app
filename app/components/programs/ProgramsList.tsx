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

const programs = [
  new Program(
    ProgramType.Fitness,
    "Fitness Plan – Strength",
    ProgramSchedule.Today,
    `
## Exercises
- Squat – 3 sets of 5 reps
- Bench Press – 3 sets of 5 reps
- Barbell Row – 3 sets of 8 reps
- Plank – 3 sets of 30–60 sec

## Additional Notes
- Warm-up before workouts (5–10 mins cardio + light sets).
- Core/Assistance: 30–60 seconds
- Compound lifts: 1.5–3 minutes
- Stretch or do mobility work after workouts.
    `
  ),
  new Program(
    ProgramType.Nutrition,
    "Nutrition Plan – Balanced",
    ProgramSchedule.Today,
    `
## Guidelines
- Eat whole foods: fruits, vegetables, lean proteins
- Stay hydrated
- Limit processed foods

## Notes
- Prep meals ahead of time
- Avoid skipping breakfast
    `
  ),
  new Program(
    ProgramType.Cognition,
    "Cognition Plan – Focus",
    ProgramSchedule.Today,
    `
## Exercises
- Daily mindfulness: 10 minutes
- Journaling: 5–10 minutes
- Brain games or puzzles: 15 minutes

## Notes
- Practice single-tasking
- Reduce digital distractions
    `
  ),
  new Program(
    ProgramType.Clinical,
    "Clinical Plan – Check-ins",
    ProgramSchedule.Today,
    `
## Appointments
- Regular GP check-up
- Specialist consultation (if required)
- Medication tracking

## Notes
- Follow reminders set by healthcare provider
- Report side effects early
    `
  ),
  new Program(
    ProgramType.Mental,
    "Mental Plan – Wellbeing",
    ProgramSchedule.ThisWeek,
    `
## Practices
- Daily gratitude journaling
- Weekly therapy session
- Relaxation routine (music, nature walks)

## Notes
- Prioritize sleep
- Stay socially connected
    `
  ),
  new Program(
    ProgramType.Identity,
    "Identity Plan – Self Development",
    ProgramSchedule.ThisWeek,
    `
## Activities
- Explore personal values
- Creative expression (art, writing, music)
- Volunteer or join a community group

## Notes
- Reflect on progress weekly
- Celebrate small wins
    `
  ),
];

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
