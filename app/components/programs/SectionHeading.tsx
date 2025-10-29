import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  useFonts,
  Quicksand_300Light,
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
} from "@expo-google-fonts/quicksand";
import { ProgramSchedule } from "../../utils/program";

type SectionHeadingProps = {
  title: string;
  schedule: ProgramSchedule;
};

const sectionColors: Record<ProgramSchedule, string> = {
  [ProgramSchedule.Today]: "#fff",
  [ProgramSchedule.ThisWeek]: "#fff",
  [ProgramSchedule.NextWeek]: "#fff",
  [ProgramSchedule.Future]: "#fff",
};

const SectionHeading: React.FC<SectionHeadingProps> = ({ title, schedule }) => {
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
    <View style={styles.container}>
      <View
        style={[
          styles.line,
          { backgroundColor: sectionColors[schedule as ProgramSchedule] },
        ]}
      />
      <Text
        style={[
          styles.text,
          { color: sectionColors[schedule as ProgramSchedule] },
        ]}
      >
        {title}
      </Text>
      <View
        style={[
          styles.line,
          { backgroundColor: sectionColors[schedule as ProgramSchedule] },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#fff",
    marginHorizontal: 12,
  },
  text: {
    fontSize: 24,
    fontWeight: "500",
    color: "#fff",
    fontFamily: "Quicksand_500Medium",
  },
});

export default SectionHeading;
