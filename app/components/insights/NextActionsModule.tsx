import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  useFonts,
  Quicksand_300Light,
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
} from "@expo-google-fonts/quicksand";

interface NextActionsModuleProps {
  actions?: Array<{
    title: string;
    text: string;
  }>;
}

const NextActionsModule: React.FC<NextActionsModuleProps> = ({ actions: actionsData }) => {
  const actions = actionsData || [
    { title: "Loading Action 1...", text: "Please wait while we generate your personalized recommendations." },
    { title: "Loading Action 2...", text: "Your insights are being prepared based on your conversation history." },
  ];
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
      <Text style={styles.heading}>What to do next...</Text>
      {actions.map((item, idx) => (
        <View key={idx} style={styles.option}>
          <Text style={styles.optionTitle}>
            <MaterialCommunityIcons name="leaf" size={16} color="#fff" />{" "}
            {item.title}
          </Text>
          <Text style={styles.optionText}>{item.text}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#3b5f5f",
    borderRadius: 30,
    padding: 24,
    margin: 16,
    gap: 10,
  },
  heading: {
    fontSize: 22,
    textAlign: "center",
    marginBottom: 16,
    color: "#fff",
    fontFamily: "Quicksand_500Medium",
  },
  option: {
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 6,
    fontFamily: "Quicksand_600SemiBold",
  },
  optionText: {
    fontSize: 12,
    lineHeight: 20,
    color: "#f0f0f0",
    fontFamily: "Quicksand_500Medium",
  },
});

export default NextActionsModule;
