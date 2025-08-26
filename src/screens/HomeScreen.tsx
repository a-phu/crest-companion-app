import React from "react";
import { SafeAreaView, Text, Button, StyleSheet } from "react-native";
import ChatbotScreen from "./ChatbotScreen";
import InsightsScreen from "./InsightsScreen";
import ActionsScreen from "./ActionsScreen";
import {
  TabsProvider,
  Tabs,
  TabScreen,
  useTabIndex,
  useTabNavigation,
} from "react-native-paper-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";

const HomeScreen = () => {
  return (
    <SafeAreaProvider>
      <TabsProvider
        defaultIndex={0}
        // onChangeIndex={handleChangeIndex} optional
      >
        <Tabs
          showTextLabel={false}
          showLeadingSpace={true}
          style={styles.container}
        >
          <TabScreen label="Chat">
            <ChatbotScreen />
          </TabScreen>
          <TabScreen label="Insights">
            <InsightsScreen />
          </TabScreen>
          <TabScreen label="Actions">
            <ActionsScreen />
          </TabScreen>
        </Tabs>
      </TabsProvider>
    </SafeAreaProvider>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
