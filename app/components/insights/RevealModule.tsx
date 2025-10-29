import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  useFonts,
  Quicksand_300Light,
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
} from "@expo-google-fonts/quicksand";

interface RevealModuleProps {
  reveal?: string;
}

const RevealModule: React.FC<RevealModuleProps> = ({ reveal }) => {
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
    <View style={styles.container}>
      <Text style={styles.heading}>What We’re Seeing</Text>
      <Text style={styles.text}>
        {reveal ||
          "Welcome to your comprehensive wellness insights! I analyze 8 key areas of your wellbeing: Cognition, Identity, Mind, Clinical, Nutrition, Training, Body, and Sleep. As you share more about your experiences across these dimensions, I'll provide increasingly personalized observations and actionable recommendations tailored to your unique wellness journey."}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#7fa6a6",
    borderRadius: 30,
    padding: 24,
    margin: 16,

    gap: 10,
  },
  heading: {
    fontSize: 22,
    textAlign: "center",
    marginBottom: 12,
    color: "#fff",
    fontFamily: "Quicksand_500Medium",
  },
  text: {
    fontSize: 13,
    color: "#fff",
    lineHeight: 20,
    textAlign: "center",
    fontFamily: "Quicksand_500Medium",
  },
});

export default RevealModule;
