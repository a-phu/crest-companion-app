import React, { useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  ImageBackground,
  useWindowDimensions,
} from "react-native";
import { PageIndicator } from "react-native-page-indicator";
import InsightsScreen from "./InsightsScreen";
import ActionsScreen from "./ActionsScreen";
import ChatbotScreen from "./ChatbotScreen";
import { LinearGradient } from "expo-linear-gradient";

type ScreenEntry = {
  key: string;
  component: React.ComponentType<any>;
};

const screens: ScreenEntry[] = [
  { key: "chatbot", component: ChatbotScreen }, // index 0
  { key: "insights", component: InsightsScreen }, // index 1
  { key: "actions", component: ActionsScreen }, // index 2
];

const pages = ["Page 1", "Page 2", "Page 3"];

export default function CrestPageIndicatorTabs() {
  const { width, height } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;
  const animatedCurrent = useRef(Animated.divide(scrollX, width)).current;

  return (
    <ImageBackground
      source={require("../../assets/mountain-abstract.png")}
      resizeMode="cover"
      style={styles.root}
    >
      <LinearGradient
        colors={["#425C56", "#789D93"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientOverlay}
      />
      <Animated.ScrollView
        horizontal={true}
        pagingEnabled={true}
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          {
            useNativeDriver: true,
          }
        )}
      >
        {screens.map(({ key, component: Screen }) => (
          <View key={key} style={[styles.page, { width, height }]}>
            <Screen />
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
  background: {
    // flex: 1,
    // alignItems: "center",
    // justifyContent: "center",
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
