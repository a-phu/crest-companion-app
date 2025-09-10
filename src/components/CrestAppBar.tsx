import { Appbar } from "react-native-paper";
import React from "react";
import { StyleSheet, Text } from "react-native";
import {
  useFonts,
  Quicksand_300Light,
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
} from "@expo-google-fonts/quicksand";

type Props = { heading: string };

export default function CrestAppBar({ heading }: Props) {
  let [fontsLoaded] = useFonts({
    Quicksand_300Light,
    Quicksand_400Regular,
    Quicksand_600SemiBold,
    Quicksand_500Medium,
  });

  if (!fontsLoaded) {
    return <Text>Loading...</Text>;
  }

  return (
    <Appbar style={styles.appBarContainer}>
      {/* <Appbar.Action icon="menu" /> */}
      <Appbar.Content
        title={heading}
        mode="large"
        style={styles.appBar}
        titleStyle={styles.title}
      />
    </Appbar>
  );
}

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
    fontFamily: "Quicksand_500Medium",
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
