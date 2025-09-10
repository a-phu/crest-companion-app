import React from "react";
import { Text, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";

const HelpBubble = () => {
  return (
    <BlurView intensity={30} tint="dark" style={styles.bubble}>
      <Text style={styles.text}>How can I help you?</Text>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: "rgba(255, 255, 255, 0.23)",
    paddingVertical: 50,
    paddingHorizontal: 50,
    borderRadius: 100,
    height: 200,
    width: 200,
    alignSelf: "center",
    margin: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    justifyContent: "center",
    overflow: "hidden",
  },
  text: {
    fontSize: 20,
    color: "#fff", // white text
    textAlign: "center",
    // fontWeight: "500",
  },
  bubbleBlur: {
    borderRadius: 50,
    width: 200,
    height: 200,
    overflow: "hidden",
  },
});

export default HelpBubble;
