import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { Appbar } from "react-native-paper";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";

const InsightsScreen = () => {
  return (
    <SafeAreaProvider style={{ backgroundColor: "#ffffff" }}>
      <SafeAreaView style={styles.container}>
        <Appbar>
          {/* <Appbar.Action icon="menu" /> */}
          <Appbar.Content title="Insights" style={styles.title} />
        </Appbar>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default InsightsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",

    marginTop: 50,
    marginBottom: 20,
  },
  title: {
    flexDirection: "row",
    justifyContent: "center",
    textAlign: "center",
  },
  chatContainer: { flex: 1, paddingHorizontal: 10 },
});
