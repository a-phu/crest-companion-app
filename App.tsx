import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import "react-native-get-random-values";
import HomeScreen from "./app/screens/HomeScreen";
import CrestTabs from "./app/screens/CrestTabs";
import { AuthProvider } from "./src/contexts/AuthContext";
import AuthDebug from "./src/screens/AuthDebug";

// TODO: work out nav flow & data flow for app
const Stack = createStackNavigator();

// TODO: create splash screen
export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CrestPageIndicatorTabs"
            component={CrestTabs}
            options={{ headerShown: false }}
          />
          {/* Temporary screen for testing auth flows during development */}
          <Stack.Screen
            name="AuthDebug"
            component={AuthDebug}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}
