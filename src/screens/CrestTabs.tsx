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

const CrestTabs = () => {
  return (
    <TabsProvider
      defaultIndex={0}
      // onChangeIndex={handleChangeIndex} optional
    >
      <Tabs
        showTextLabel={true}
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
  );
};

export default CrestTabs;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
