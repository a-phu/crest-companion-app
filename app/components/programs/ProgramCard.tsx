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
  content: string[]; // Markdown string
  planType: string;
};

// const programImages: Record<ProgramType, any> = {
//   fitness: require("../../../assets/programs/fitness-plan.png"),
//   nutrition: require("../../../assets/programs/nutrition-plan.png"),
//   cognition: require("../../../assets/programs/cognition-plan.png"),
//   clinical: require("../../../assets/programs/clinical-plan.png"),
//   mind: require("../../../assets/programs/mental-plan.png"),
//   identity: require("../../../assets/programs/identity-plan.png"),
//   sleep: require("../../../assets/programs/sleep-plan.png"),
//   training: require("../../../assets/programs/training-plan.png"),
//   body: require("../../../assets/programs/training-plan.png"),
//   other: require("../../../assets/programs/training-plan.png"),
// };
export const programImages: Record<ProgramType, any> = {
  [ProgramType.Fitness]: require("../../../assets/programs/fitness-plan.png"),
  [ProgramType.Nutrition]: require("../../../assets/programs/nutrition-plan.png"),
  [ProgramType.Cognition]: require("../../../assets/programs/cognition-plan.png"),
  [ProgramType.Clinical]: require("../../../assets/programs/clinical-plan.png"),
  [ProgramType.Mind]: require("../../../assets/programs/mental-plan.png"),
  [ProgramType.Identity]: require("../../../assets/programs/identity-plan.png"),
  [ProgramType.Sleep]: require("../../../assets/programs/sleep-plan.png"),
  [ProgramType.Training]: require("../../../assets/programs/training-plan.png"),
  [ProgramType.Body]: require("../../../assets/programs/training-plan.png"),
  [ProgramType.Other]: require("../../../assets/programs/training-plan.png"),
};
const ProgramCard: React.FC<ProgramCardProps> = ({
  title,
  content,
  planType,
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
        source={programImages[normalizeAgentFromIntent(planType)]}
        style={styles.image}
        imageStyle={styles.imageStyle}
      >
        <View style={styles.overlayRow}>
          <Text style={styles.titleOverlay}>{title}</Text>

          <TouchableOpacity onPress={toggleExpand}>
            <Text style={styles.moreOverlay}>{expanded ? "" : "╋"}</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>

      {expanded && (
        <View style={styles.content}>
          <MarkdownList blocks={content} />
          <TouchableOpacity onPress={toggleExpand}>
            <Text style={styles.more}>{expanded ? "━" : ""}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

interface MarkdownListProps {
  blocks: string[];
}

export const MarkdownList: React.FC<MarkdownListProps> = ({ blocks }) => {
  const sanitizedBlocks = blocks.map(
    (text) => text.replace(/\|/g, "•") // replace unsupported pipe character
  );

  return (
    <View style={{ marginBottom: 16 }}>
      {sanitizedBlocks.map((block, idx) => (
        <Markdown
          key={idx}
          style={markdownStyles}
          rules={{
            // fallback for anything unknown
            unknown: () => null,
          }}
        >
          {block}
        </Markdown>
      ))}
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
    alignItems: "center",
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.3)", // dark overlay for text readability
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
  },
  titleOverlay: {
    fontSize: 18,
    fontWeight: 800,
    color: "#fff",
    marginBottom: 8,
    fontFamily: "Quicksand_500Medium",
    width: "80%",
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

export default ProgramCard;
export function normalizeAgentFromIntent(type: String): ProgramType {
  const programType = type.toLowerCase().split(".")[0];

  if (programType === "training") return ProgramType.Training;
  if (programType === "nutrition") return ProgramType.Nutrition;
  if (programType === "sleep") return ProgramType.Sleep;
  if (programType === "mind") return ProgramType.Mind;
  if (programType === "body") return ProgramType.Body;
  if (programType === "clinical") return ProgramType.Clinical;
  if (programType === "cognition") return ProgramType.Cognition;
  if (programType === "identity") return ProgramType.Identity;
  return ProgramType.Other;
}
