// app/screens/DbTestScreen.tsx
import React, { useState } from "react";
import { View, Text, Button, ScrollView, StyleSheet } from "react-native";
import { DbSmokeTestUsers } from "../../Backend/src/db/DbSmokeTestUsers";

export default function DbTestScreen() {
  const [log, setLog] = useState<string>("");

  async function run() {
    const buf: string[] = [];
    const capture = (msg: any, ...rest: any[]) => buf.push(String(msg), ...(rest.map(String)), "\n");

    try {
      capture("== DB Smoke Test start ==");
      await DbSmokeTestUsers(); // your test already logs to console; that’s fine
      capture("✅ Finished OK");
    } catch (e: any) {
      capture("❌ Failed:", e?.message ?? String(e));
    } finally {
      setLog(buf.join(""));
    }
  }

  return (
    <View style={styles.container}>
      <Button title="Run DB Smoke Test" onPress={run} />
      <ScrollView style={styles.logBox}>
        <Text selectable>{log}</Text>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  logBox: { flex: 1, borderWidth: 1, padding: 12, borderRadius: 8 },
});
