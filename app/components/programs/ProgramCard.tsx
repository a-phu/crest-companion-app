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
  moduleType: ProgramType;
  title: string;
  content: string; // Markdown string
};

const programImages: Record<ProgramType, any> = {
  fitness: require("../../../assets/programs/fitness-plan.png"),
  nutrition: require("../../../assets/programs/nutrition-plan.png"),
  cognition: require("../../../assets/programs/cognition-plan.png"),
  clinical: require("../../../assets/programs/clinical-plan.png"),
  mental: require("../../../assets/programs/mental-plan.png"),
  identity: require("../../../assets/programs/identity-plan.png"),
  sleep: require("../../../assets/programs/sleep-plan.png"),
  training: require("../../../assets/programs/training-plan.png"),
};

const ProgramCard: React.FC<ProgramCardProps> = ({
  moduleType,
  title,
  content,
}) => {
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
      <ImageBackground
        source={programImages[moduleType]}
        style={styles.image}
        imageStyle={styles.imageStyle}
      >
        <View style={styles.overlayRow}>
          <Text style={styles.titleOverlay}>{title}</Text>

          <TouchableOpacity onPress={toggleExpand}>
            <Text style={styles.moreOverlay}>{expanded ? "" : "More..."}</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>

      {expanded && (
        <View style={styles.content}>
          <Markdown style={markdownStyles}>{content}</Markdown>
          <TouchableOpacity onPress={toggleExpand}>
            <Text style={styles.more}>{expanded ? "Less..." : ""}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#CBD7D9",
    margin: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  image: {
    width: "100%",
    height: 180,
    justifyContent: "flex-end",
  },
  imageStyle: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  overlayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.3)", // dark overlay for text readability
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 800,
    color: "#425C56",
    marginBottom: 8,
    fontFamily: "Quicksand_600SemiBold",
  },
  titleOverlay: {
    fontSize: 18,
    fontWeight: 800,
    color: "#fff",
    marginBottom: 8,
    fontFamily: "Quicksand_600SemiBold",
  },
  more: {
    fontSize: 14,
    color: "#425C56",
    textAlign: "right",
    marginTop: 8,
    opacity: 0.9,
    fontFamily: "Quicksand_600SemiBold",
  },
  moreOverlay: {
    fontSize: 14,
    color: "#fff",
    textAlign: "right",
    marginTop: 8,
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

export default ProgramCard;
