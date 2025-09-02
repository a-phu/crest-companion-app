import {
  StyleSheet,
  View,
  Text,
  Button,
  ImageBackground,
  Pressable,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";

export default function HomeScreen({ navigation }) {
  return (
    <ImageBackground
      source={require("../../assets/crest-bg-mountain-hill.png")}
      resizeMode="cover"
      style={styles.background}
    >
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Image
            style={styles.crestLogo}
            source={require("../../assets/crest-logo-white.png")}
          />
        </View>
        <View style={styles.contentContainer}>
          <Text style={styles.welcomeText}>
            Hello!{"\n"}I am the Crest Companion
          </Text>

          <Pressable
            style={styles.checkInBtn}
            //   onPress={() => navigation.navigate("CrestTabs")}
            onPress={() => navigation.navigate("CrestPageIndicatorTabs")}
          >
            <Feather name="triangle" size={14} style={styles.checkInIcon} />

            <Text style={styles.checkInText}>Check-in</Text>
          </Pressable>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    justifyContent: "space-between",
    padding: 20,
    marginTop: 180,
    gap: 30,
  },
  background: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    // flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 50,
  },
  crestLogo: {
    height: 300,
    width: 300,
  },
  contentContainer: {
    flex: 1,
    gap: 30,
    alignItems: "center", // comment this for full width
    justifyContent: "flex-start",
    flexDirection: "column",
  },
  welcomeText: {
    color: "white",
    fontWeight: 400,
    fontSize: 40,
    // flex: 1,
    textAlign: "center",
  },
  checkInBtn: {
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
    opacity: 0.8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    height: 50,
  },
  checkInText: {
    fontWeight: 500,
    fontSize: 16,
  },
  checkInIcon: {
    transform: [{ rotate: "90deg" }],
  },
});
