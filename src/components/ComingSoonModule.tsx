import type { Message } from "../utils/types";
import { StyleSheet, Text, View, Image } from "react-native";

export default function ComingSoonModule() {
  return (
    <View style={styles.contentContainer}>
      <Text>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  comingSoonIcon: {
    height: 100,
    width: 100,
  },
  text: {
    fontWeight: 400,
    fontSize: 40,
    textAlign: "center",
  },
  contentContainer: {
    flexDirection: "column",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
