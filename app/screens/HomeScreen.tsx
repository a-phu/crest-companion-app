import {
  StyleSheet,
  View,
  Text,
  ImageBackground,
  Pressable,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import {
  useFonts,
  Montserrat_200ExtraLight,
  Montserrat_400Regular,
  Montserrat_600SemiBold,
} from "@expo-google-fonts/montserrat";
import {
  Quicksand_300Light,
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
} from "@expo-google-fonts/quicksand";
import { Poppins_400Regular } from "@expo-google-fonts/poppins";
import {
  Raleway_600SemiBold,
  Raleway_500Medium_Italic,
  Raleway_500Medium,
} from "@expo-google-fonts/raleway";

export default function HomeScreen({ navigation }) {
  let [fontsLoaded] = useFonts({
    Montserrat_200ExtraLight,
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Quicksand_300Light,
    Quicksand_400Regular,
    Quicksand_600SemiBold,
    Quicksand_500Medium,
    Poppins_400Regular,
    Raleway_600SemiBold,
    Raleway_500Medium_Italic,
    Raleway_500Medium,
  });

  if (!fontsLoaded) {
    return <Text>Loading...</Text>;
  }

  return (
    <ImageBackground
      source={require("../../assets/mountain-snow.png")}
      resizeMode="cover"
      style={styles.background}
    >
      {/* <View style={styles.hueOverlay} /> */}
      {/* <LinearGradient
        colors={["#425C56", "#789D93"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientOverlay}
      /> */}
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Image
            style={styles.crestLogo}
            source={require("../../assets/crest-logo-white.png")}
          />
        </View>
        <View style={styles.contentContainer}>
          <View>
            <Text style={styles.welcomeText}>Hello!</Text>
            <Text style={styles.subtitleText}>
              I am the{"\n"}Crest Companion.
            </Text>
          </View>
          <Pressable
            style={styles.checkInBtn}
            onPress={() => navigation.navigate("CrestPageIndicatorTabs")}
          >
            <Text style={styles.checkInText}>&#9656; Check-in</Text>
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
    // padding: 20,
    marginTop: 250,
    gap: 40,
    // backgroundColor: "#354f5249",
  },
  background: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#354f5249",
  },
  logoContainer: {
    // flex: 1,
    alignItems: "center",
    justifyContent: "center",
    // gap: 50,
  },
  crestLogo: {
    height: 300,
    width: 300,
  },

  contentContainer: {
    flex: 1,
    gap: 30,
    // alignItems: "center", // comment this for full width
    justifyContent: "flex-end",
    flexDirection: "column",
  },
  welcomeText: {
    color: "#fff",
    fontSize: 40,
    fontFamily: "Raleway_500Medium_Italic",
  },
  subtitleText: {
    color: "#fff",
    fontSize: 40,
    fontFamily: "Quicksand_500Medium",
  },
  checkInBtn: {
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#ffffffde",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    height: 50,
    marginBottom: 100,
  },
  checkInText: {
    fontWeight: 500,
    fontSize: 16,
    color: "#1A252F",
    fontFamily: "Quicksand_600SemiBold",
  },
  checkInIcon: {
    transform: [{ rotate: "90deg" }],
    color: "#1A252F",
    fontWeight: 500,
  },
  hueOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#354f5249",
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },
});
