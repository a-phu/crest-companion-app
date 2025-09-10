import React from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
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
    marginTop: 20,
    marginBottom: 20,
  },
  contentContainer: {
    flexDirection: "column",
    flex: 1,
  },
});
