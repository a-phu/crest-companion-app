import { StyleSheet } from "react-native";
import { NavigationContainer, ThemeProvider } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import "react-native-get-random-values";
import CrestTabs from "./src/screens/CrestTabs";
import HomeScreen from "./src/screens/HomeScreen";

// TODO: work out nav flow & data flow for app
const Stack = createStackNavigator();

// TODO: create splash screen
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CrestTabs"
          component={CrestTabs}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>

    // <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
    //   <Stack>
    //     <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    //     <Stack.Screen name="+not-found" />
    //   </Stack>
    //   <StatusBar style="auto" />
    // </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    // marginVertical: 30,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
