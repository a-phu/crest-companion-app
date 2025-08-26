import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";

const InsightsScreen = () => {
  return (
    <View style={styles.container}>
      <Text>Insights Screen</Text>
    </View>
  );
};

export default InsightsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
