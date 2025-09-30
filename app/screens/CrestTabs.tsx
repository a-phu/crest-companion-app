import React, { useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  View,
  ImageBackground,
  useWindowDimensions,
} from "react-native";
import { PageIndicator } from "react-native-page-indicator";
import InsightsScreen from "./InsightsScreen";
import ProgramsScreen from "./ProgramsScreen";
import ChatbotScreen from "./ChatbotScreen";
import { LinearGradient } from "expo-linear-gradient";

type ScreenEntry = {
  key: string;
  component: React.ComponentType<any>;
};

const screens: ScreenEntry[] = [
  { key: "chatbot", component: ChatbotScreen }, // index 0
  { key: "insights", component: InsightsScreen }, // index 1
  { key: "actions", component: ProgramsScreen }, // index 2
];

const pages = ["Page 1", "Page 2", "Page 3"];

export default function CrestTabs() {
  const { width, height } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;
  const animatedCurrent = useRef(Animated.divide(scrollX, width)).current;
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <ImageBackground
      source={require("../../assets/backgrounds/mountain-abstract.png")}
      resizeMode="cover"
      style={styles.root}
    >
      <LinearGradient
        colors={["#425C56", "#AFCBCB"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientOverlay}
      />
      <Animated.ScrollView
        horizontal={true}
        pagingEnabled={true}
        showsHorizontalScrollIndicator={false}
        onScroll={(event) => {
          const offsetX = event.nativeEvent.contentOffset.x;
          setCurrentIndex(Math.round(offsetX / width));
          scrollX.setValue(offsetX);
        }}
      >
        {screens.map(({ key, component: Screen }, index) => (
          <View key={key} style={[styles.page, { width, height }]}>
            <Screen isVisible={currentIndex === index} />
          </View>
        ))}
      </Animated.ScrollView>
      <View style={styles.pageIndicator}>
        <PageIndicator
          color="#ffffff"
          count={pages.length}
          current={animatedCurrent}
        />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  page: {
    // alignItems: "center",
    // justifyContent: "center",
  },
  pageIndicator: {
    left: 20,
    right: 20,
    bottom: 35,
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  indicatorDot: {
    color: "#CAD2C5",
  },
  hueOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1a252f57",
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },
});
