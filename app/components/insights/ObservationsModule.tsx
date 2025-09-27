import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  useFonts,
  Quicksand_300Light,
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
} from "@expo-google-fonts/quicksand";

interface ObservationsModuleProps {
  observations?: {
    sleep: string;
    nutrition: string;
    mood: string;
    cognition: string;
  };
}

const ObservationsModule: React.FC<ObservationsModuleProps> = ({ observations: observationsData }) => {
  const observations = observationsData ? [
    { title: "Sleep", text: observationsData.sleep },
    { title: "Nutrition", text: observationsData.nutrition },
    { title: "Mood", text: observationsData.mood },
    { title: "Cognition", text: observationsData.cognition },
  ] : [
    { title: "Sleep", text: "Loading sleep insights..." },
    { title: "Nutrition", text: "Loading nutrition insights..." },
    { title: "Mood", text: "Loading mood insights..." },
    { title: "Cognition", text: "Loading cognition insights..." },
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
      <Text style={styles.heading}>Some observations...</Text>
      <View style={styles.grid}>
        {observations.map((item, idx) => (
          <View key={idx} style={styles.card}>
            <Text style={styles.cardTitle}>
              {item.title}{" "}
              <MaterialIcons name="check-circle" size={16} color="#4a7c7c" />
            </Text>
            <Text style={styles.cardText}>{item.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#C1CDC4",
    borderRadius: 30,
    padding: 24,
    margin: 16,
    gap: 10,
  },
  heading: {
    fontSize: 22,
    textAlign: "center",
    marginBottom: 12,
    color: "#354F52",
    fontFamily: "Quicksand_500Medium",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  card: {
    width: "48%",
    marginBottom: 12,
  },
  cardTitle: {
    marginBottom: 4,
    fontSize: 16,
    color: "#354F52",
    fontFamily: "Quicksand_600SemiBold",
  },
  cardText: {
    fontSize: 12,
    color: "#354F52",
    fontFamily: "Quicksand_500Medium",
  },
});

export default ObservationsModule;
