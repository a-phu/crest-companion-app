import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";

const ActionsScreen = () => {
  return (
    <View style={styles.container}>
      <Text>Actions Screen</Text>
    </View>
  );
};

export default ActionsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
