import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import CrestAppBar from "../components/CrestAppBar";
import ObservationsModule from "../components/insights/ObservationsModule";
import RevealModule from "../components/insights/RevealModule";
import NextActionsModule from "../components/insights/NextActionsModule";
import {
  useFonts,
  Quicksand_300Light,
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
} from "@expo-google-fonts/quicksand";

const InsightsScreen = () => {
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
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <CrestAppBar heading={"Prepare"} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.contentContainer}
        >
          <ObservationsModule />
          <RevealModule />
          <NextActionsModule />
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default InsightsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 20,
    marginBottom: 20,
  },
  contentContainer: {
    flexDirection: "column",
    flex: 1,
    gap: 12,
  },
});
