import React, { useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  ActivityIndicator,
  View,
  RefreshControl,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import CrestAppBar from "../components/CrestAppBar";
import ObservationsModule from "../components/insights/ObservationsModule";
import RevealModule from "../components/insights/RevealModule";
import NextActionsModule from "../components/insights/NextActionsModule";
import api from "../scripts/axiosClient";
import {
  useFonts,
  Quicksand_300Light,
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
} from "@expo-google-fonts/quicksand";
import Insight from "../utils/insight";

type InsightsData = {
  observations: {
    cognition: string;
    identity: string;
    mind: string;
    clinical: string;
    nutrition: string;
    training: string;
    body: string;
    sleep: string;
  };
  nextActions: Array<{
    title: string;
    text: string;
  }>;
  reveal: string;
};

const InsightsScreen = ({ isVisible }: { isVisible: boolean }) => {
  const [insights, setInsights] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  let [fontsLoaded] = useFonts({
    Quicksand_300Light,
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
  });

  const fetchInsights = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);

      const response = await api.get("/insights");

      // ✅ Map API payload into your Insight class
      const mappedInsights = new Insight(response.data.insights);
      if (response.data.source === "default") {
        console.log("no insights found");
      }

      setInsights(mappedInsights);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch insights:", err);
      setError("Failed to load insights. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const generateInsights = useCallback(async () => {
    try {
      await api.post("/insights/generate");
    } catch (err: any) {
      console.error("Failed to generate insights:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    console.log(`is Insights Screen visible: ${isVisible}`);
    if (isVisible && fontsLoaded) {
      fetchInsights();
      // if (insights == null) {
      //   generateInsights();
      // }
    }
  }, [isVisible, fontsLoaded, fetchInsights]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInsights();
  }, [fetchInsights]);

  if (!fontsLoaded) {
    return <Text>Loading fonts...</Text>;
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <CrestAppBar
            heading={"Today’s Insights"}
            subtitle={"Your System’s State."}
          />

          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.loadingText}>Generating your insights...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (error || !insights) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <CrestAppBar
            heading={"Today’s Insights"}
            subtitle={"Your System’s State."}
          />
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {error || "Unable to load insights"}
            </Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <CrestAppBar
          heading={"Today’s Insights"}
          subtitle={"Your System’s State."}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {insights ? (
            <View>
              <ObservationsModule observations={insights.observations} />
              <RevealModule reveal={insights.reveal} />
              <NextActionsModule actions={insights.nextActions} />
            </View>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                {error || "Unable to load insights"}
              </Text>
            </View>
          )}
          <Text style={styles.viewNextScreenText}>View Your Plans →</Text>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default InsightsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 20,
    marginBottom: 20,
  },
  contentContainer: {
    flexDirection: "column",
    flex: 1,
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#fff",
    fontFamily: "Quicksand_500Medium",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    fontFamily: "Quicksand_500Medium",
  },
  viewNextScreenText: {
    fontFamily: "Raleway_500Medium_Italic",
    color: "white",
    textAlign: "center",
    marginVertical: 10,
    fontSize: 16,
  },
});
