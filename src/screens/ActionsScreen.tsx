import React from "react";
import { View, Text, Button, StyleSheet, SafeAreaView } from "react-native";
import { Appbar } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ComingSoonModule from "../components/ComingSoonModule";

const ActionsScreen = () => {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <Appbar style={styles.appBarContainer}>
          {/* <Appbar.Action icon="menu" /> */}
          <Appbar.Content
            title="Schedule"
            style={styles.appBar}
            titleStyle={styles.title}
          />
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
    // justifyContent: "space-between",
    marginTop: 40,
    marginBottom: 20,
  },
  contentContainer: {
    flexDirection: "column",
    flex: 1,
    // justifyContent: "center",
    // alignItems: "center",
  },
  title: {
    color: "#fff",
    fontSize: 30,
    // fontWeight: 500,
  },
  appBar: {
    flexDirection: "row",
    // justifyContent: "center",
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
