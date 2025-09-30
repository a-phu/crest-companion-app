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
    cognition: string;
    identity: string;
    mind: string;
    clinical: string;
    nutrition: string;
    training: string;
    body: string;
    sleep: string;
  };
}

const ObservationsModule: React.FC<ObservationsModuleProps> = ({
  observations: observationsData,
}) => {
  const observations = observationsData
    ? [
        { title: "Cognition", text: observationsData.cognition },
        { title: "Identity", text: observationsData.identity },
        { title: "Mind", text: observationsData.mind },
        { title: "Clinical", text: observationsData.clinical },
        { title: "Nutrition", text: observationsData.nutrition },
        { title: "Training", text: observationsData.training },
        { title: "Body", text: observationsData.body },
        { title: "Sleep", text: observationsData.sleep },
      ]
    : [
        { title: "Cognition", text: "Loading cognition insights..." },
        { title: "Identity", text: "Loading identity insights..." },
        { title: "Mind", text: "Loading mind insights..." },
        { title: "Clinical", text: "Loading clinical insights..." },
        { title: "Nutrition", text: "Loading nutrition insights..." },
        { title: "Training", text: "Loading training insights..." },
        { title: "Body", text: "Loading body insights..." },
        { title: "Sleep", text: "Loading sleep insights..." },
      ];

  // Map observation title → icon name
  // const observationIcons: Record<string, keyof typeof MaterialIcons.glyphMap> =
  //   {
  //     Cognition: "psychology", // 🧠
  //     Identity: "sentiment-satisfied", // 🙂
  //     Mind: "person", // 👤
  //     Clinical: "local-hospital", // 🏥
  //     Nutrition: "restaurant", // 🍴
  //     Training: "fitness-center", // 🏋️‍♀️
  //     Body: "face-retouching-natural", // 💁‍♀️
  //     Sleep: "bedtime", // 🌙
  //   };

  const observationIcons: Record<string, keyof typeof MaterialIcons.glyphMap> =
    {
      Cognition: "psychology", // 🧠 thinking, analysis
      Identity: "face-retouching-natural", // 🆔 uniqueness / self-identity
      Mind: "self-improvement", // 🧘‍♂️ meditation / inner mind
      Clinical: "medical-services", // 🏥 health/clinical care
      Nutrition: "restaurant", // 🍴 food / diet
      Training: "fitness-center", // 🏋️‍♀️ exercise
      Body: "accessibility-new", // 🧍 human body / posture
      Sleep: "bedtime", // 🌙 sleep / night
    };

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
              <MaterialIcons
                name={observationIcons[item.title] || "info"} // fallback if not found
                size={20}
                color="#4a7c7c"
              />
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
    gap: 8,
  },
  card: {
    width: "48%",
    marginBottom: 8,
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
