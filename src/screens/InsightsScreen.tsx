import React from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import ComingSoonModule from "../components/ComingSoonModule";
import CrestAppBar from "../components/CrestAppBar";

const InsightsScreen = () => {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <CrestAppBar heading={"Prepare"} />
        <ComingSoonModule />
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
  },
  title: {
    color: "#fff",
    fontSize: 30,
  },
  appBar: {
    flexDirection: "row",
    textAlign: "center",
  },
  chatContainer: { flex: 1, paddingHorizontal: 10 },
  appBarContainer: {
    backgroundColor: "transparent",
    alignItems: "center",
    flexDirection: "column",
  },
});
