import React from "react";
import { StyleSheet, Text } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import CrestAppBar from "../components/CrestAppBar";
import SectionHeading from "../components/programs/SectionHeading";
import ProgramsList from "../components/programs/ProgramsList";

const ProgramsScreen = () => {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <CrestAppBar heading={"Programs"} />
        <ProgramsList />
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
