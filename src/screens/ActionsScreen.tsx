import React from "react";
import { View, Text, Button, StyleSheet, SafeAreaView } from "react-native";
import { Appbar } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ComingSoonModule from "../components/ComingSoonModule";

const ActionsScreen = () => {
  return (
    <SafeAreaProvider style={{ backgroundColor: "#ffffff" }}>
      <SafeAreaView style={styles.container}>
        <Appbar>
          {/* <Appbar.Action icon="menu" /> */}
          <Appbar.Content title="Actions" style={styles.title} />
        </Appbar>
        <ComingSoonModule />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default ActionsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",

    // marginTop: 50,
    marginBottom: 20,
  },
  title: {
    flexDirection: "row",
    justifyContent: "center",
    textAlign: "center",
  },
  chatContainer: { flex: 1, paddingHorizontal: 10 },
});
