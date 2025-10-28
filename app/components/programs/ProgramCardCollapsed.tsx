import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  ImageBackground,
  UIManager,
} from "react-native";
import Markdown from "react-native-markdown-display";
import {
  useFonts,
  Quicksand_300Light,
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
} from "@expo-google-fonts/quicksand";
import { ProgramType } from "../../utils/program";

// Enable animation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ProgramCardProps = {
  title: string;
};

const programImages: Record<ProgramType, any> = {
  fitness: require("../../../assets/programs/fitness-plan.png"),
  nutrition: require("../../../assets/programs/nutrition-plan.png"),
  cognition: require("../../../assets/programs/cognition-plan.png"),
  clinical: require("../../../assets/programs/clinical-plan.png"),
  mind: require("../../../assets/programs/mental-plan.png"),
  identity: require("../../../assets/programs/identity-plan.png"),
  sleep: require("../../../assets/programs/sleep-plan.png"),
  training: require("../../../assets/programs/training-plan.png"),
  body: require("../../../assets/programs/training-plan.png"),
  other: require("../../../assets/programs/training-plan.png"),
};

const ProgramCardCollapsed: React.FC<ProgramCardProps> = ({ title }) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
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
    <View style={styles.card}>
      <View style={styles.overlayRow}>
        <Text style={styles.titleOverlay}>{title}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#2d494e9b",
    marginHorizontal: 12,
    marginVertical: 4,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  overlayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
    paddingHorizontal: 18,
    backgroundColor: "rgba(0,0,0,0.3)", // dark overlay for text readability
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: "#425C56",
    marginBottom: 8,
    fontFamily: "Quicksand_600SemiBold",
  },
  titleOverlay: {
    fontSize: 18,
    fontWeight: 800,
    color: "#fff",
    marginBottom: 8,
    fontFamily: "Quicksand_500Medium",
  },
  more: {
    fontSize: 14,
    color: "#425C56",
    textAlign: "right",
    marginTop: 8,
    marginRight: 12,
    opacity: 0.9,
    fontFamily: "Quicksand_600SemiBold",
  },
  moreOverlay: {
    fontSize: 14,
    color: "#fff",
    textAlign: "right",
    marginTop: 8,
    marginRight: 12,
    opacity: 0.9,
    fontFamily: "Quicksand_600SemiBold",
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    color: "#425C56",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Quicksand_500Medium",
  },
  heading2: {
    color: "#425C56",
    fontSize: 16,
    fontWeight: 600,
    marginTop: 8,
    marginBottom: 4,
    fontFamily: "Quicksand_600SemiBold",
  },
  bullet_list: {
    marginVertical: 4,
  },
  list_item: {
    flexDirection: "row",
    marginBottom: 4,
  },
});

export default ProgramCardCollapsed;
