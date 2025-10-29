import { Appbar } from "react-native-paper";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  useFonts,
  Quicksand_300Light,
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
} from "@expo-google-fonts/quicksand";
import { Raleway_500Medium_Italic } from "@expo-google-fonts/raleway";

type Props = { heading: string; subtitle: string };

export default function CrestAppBar({ heading, subtitle }: Props) {
  let [fontsLoaded] = useFonts({
    Quicksand_300Light,
    Quicksand_400Regular,
    Quicksand_600SemiBold,
    Quicksand_500Medium,
    Raleway_500Medium_Italic,
  });

  if (!fontsLoaded) {
    return <Text>Loading...</Text>;
  }

  return (
    <Appbar style={styles.appBarContainer}>
      {/* <Appbar.Action icon="menu" /> */}
      <Text style={styles.title}>{heading}</Text>

      {subtitle.length === 0 ? (
        <Text style={styles.subtitle}>{}</Text>
      ) : (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}
    </Appbar>
  );
}

const styles = StyleSheet.create({
  title: {
    color: "#fff",
    fontSize: 30,
    fontFamily: "Quicksand_500Medium",
    textAlign: "center",
    marginBottom: 5,
  },
  subtitle: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Raleway_500Medium_Italic",
    textAlign: "center",
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
    marginBottom: 20,
  },
});
