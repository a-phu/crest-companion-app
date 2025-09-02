import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { Appbar } from "react-native-paper";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import ComingSoonModule from "../components/ComingSoonModule";

const InsightsScreen = () => {
  return (
    <SafeAreaProvider style={{ backgroundColor: "#ffffff" }}>
      <SafeAreaView style={styles.container}>
        <Appbar>
          {/* <Appbar.Action icon="menu" /> */}
          <Appbar.Content title="Insights" style={styles.title} />
        </Appbar>
        <ComingSoonModule />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default InsightsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    marginBottom: 20,
  },
  contentContainer: {
    flexDirection: "column",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    flexDirection: "row",
    justifyContent: "center",
    textAlign: "center",
  },
  chatContainer: { flex: 1, paddingHorizontal: 10 },
});
