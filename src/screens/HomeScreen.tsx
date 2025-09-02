import {
  StyleSheet,
  View,
  Text,
  Button,
  ImageBackground,
  Pressable,
  Image,
} from "react-native";

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

        <Pressable
          style={styles.checkInBtn}
          onPress={() => navigation.navigate("CrestTabs")}
        >
          <Text style={styles.checkInText}>Check-in</Text>
        </Pressable>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    // alignItems: "center",
    // justifyContent: "center",
    padding: 20,
    gap: 50,
    alignItems: "center",
  },
  background: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkInBtn: {
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
    opacity: 0.8,
    width: "50%",
  },
  crestLogo: {
    height: 300,
    width: 300,
  },
  logoContainer: {
    // flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkInText: {
    fontWeight: 500,
  },
});
