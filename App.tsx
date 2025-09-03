import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import "react-native-get-random-values";
import HomeScreen from "./src/screens/HomeScreen";
import CrestPageIndicatorTabs from "./src/screens/CrestPageIndicatorTabs";

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
          name="CrestPageIndicatorTabs"
          component={CrestPageIndicatorTabs}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
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
