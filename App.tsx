import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import "react-native-get-random-values";
import HomeScreen from "./app/screens/HomeScreen";
import CrestTabs from "./app/screens/CrestTabs";
import { DbSmokeTest } from "./Backend/src/db/DbSmokeTest"; // ← add this

const Stack = createStackNavigator();

export default function App() {
  // Run once on app start; logs print in Metro terminal
  useEffect(() => {
    if (__DEV__) {
      (async () => {
        try {
          await DbSmokeTest();
        } catch (e) {
          console.error("DB smoke test failed:", e);
        }
      })();
    }
  }, []);

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
          component={CrestTabs}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
