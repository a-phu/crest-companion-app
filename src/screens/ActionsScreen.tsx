import React from "react";
import { StyleSheet, SafeAreaView } from "react-native";
import { Appbar } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ComingSoonModule from "../components/ComingSoonModule";
import CrestAppBar from "../components/CrestAppBar";

const ActionsScreen = () => {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <CrestAppBar heading={"Schedule"} />
        <ComingSoonModule />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default ActionsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 40,
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
    marginTop: 20,
  },
});
