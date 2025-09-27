import React, { useState, useEffect } from "react";
import { ScrollView, StyleSheet, Text, ActivityIndicator, View } from "react-native";
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

type InsightsData = {
  observations: {
    sleep: string;
    nutrition: string;
    mood: string;
    cognition: string;
  };
  nextActions: Array<{
    title: string;
    text: string;
  }>;
  reveal: string;
};

const InsightsScreen = () => {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  let [fontsLoaded] = useFonts({
    Quicksand_300Light,
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
  });

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true);
        const response = await api.get('/insights');
        setInsights(response.data);
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch insights:', err);
        setError('Failed to load insights. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (fontsLoaded) {
      fetchInsights();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <Text>Loading fonts...</Text>;
  }

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <CrestAppBar heading={"Prepare"} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7fa6a6" />
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
          <CrestAppBar heading={"Prepare"} />
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error || 'Unable to load insights'}</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <CrestAppBar heading={"Prepare"} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.contentContainer}
        >
          <RevealModule reveal={insights.reveal} />
          <ObservationsModule observations={insights.observations} />
          <NextActionsModule actions={insights.nextActions} />
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7fa6a6',
    fontFamily: "Quicksand_500Medium",
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff6b6b',
    textAlign: 'center',
    fontFamily: "Quicksand_500Medium",
  },
});
