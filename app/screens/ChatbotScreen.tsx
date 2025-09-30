import React, { useState, useRef } from "react";
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Platform,
  Text,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import ChatInput from "../components/chat/ChatInput";
import ChatBubble from "../components/chat/ChatBubble";
import type { Message } from "../utils/message";
import CrestAppBar from "../components/CrestAppBar";

import {
  useFonts,
  Quicksand_300Light,
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
} from "@expo-google-fonts/quicksand";

import api from "../scripts/axiosClient";

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const ChatbotScreen = () => {
  const [text, setText] = React.useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);

  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  // Stub for assistant reply (replace with API call)
  const fetchAssistantReply = async (message: string): Promise<string> => {
    try {
      const response = await api.post(
        "/chat/b9576a32-334b-4444-866e-4ec176d377ff",
        { text: message }
      );
      return response.data.reply;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  };

  const handleSend = async (userText: string) => {
    const trimmed = userText.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: genId(),
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };

    // Show user message immediately
    setMessages((prev) => [...prev, userMsg]);

    // TODO: add styling to “typing…” placeholder
    const typingId = genId();

    setMessages((prev) => [
      ...prev,
      {
        id: typingId,
        role: "assistant",
        content: "…", // or "Assistant is typing"
        createdAt: Date.now(),
      },
    ]);

    try {
      setLoading(true);
      const reply = await fetchAssistantReply(trimmed);

      // Replace the typing bubble with the real reply
      setMessages((prev) =>
        prev.map((m) =>
          m.id === typingId
            ? { ...m, content: reply, createdAt: Date.now() }
            : m
        )
      );
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === typingId
            ? {
                ...m,
                content:
                  "Sorry—something went wrong while generating a reply. Please try again.",
              }
            : m
        )
      );
    }
  };

  let [fontsLoaded] = useFonts({
    Quicksand_300Light,
    Quicksand_400Regular,
    Quicksand_600SemiBold,
    Quicksand_500Medium,
  });

  if (!fontsLoaded) {
    return <Text>Loading...</Text>;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <CrestAppBar heading={"Performance Assistant"} />
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          {messages.length === 0 ? (
            <Text style={styles.welcomeText}>How can I help you today?</Text>
          ) : (
            <ScrollView ref={scrollViewRef} keyboardShouldPersistTaps="handled">
              {messages.map((item) => (
                <ChatBubble key={item.id} msg={item} />
              ))}
            </ScrollView>
          )}
          <ChatInput onSend={handleSend} onFocusScroll={scrollToBottom} />
          {/* {loading && <ActivityIndicator size="large" color="#7fa6a6" />} */}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default ChatbotScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  appBar: {
    flexDirection: "row",
    textAlign: "center",
  },
  appBarContainer: {
    backgroundColor: "transparent",
    alignItems: "center",
    flexDirection: "column",
  },
  title: {
    color: "#fff",
    fontSize: 30,
    fontFamily: "Quicksand_500Medium",
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: 10,
    width: "100%",
  },
  welcomeText: {
    color: "white",
    fontWeight: 500,
    fontSize: 20,
    fontFamily: "Quicksand_600SemiBold",
    marginTop: 225,
    marginBottom: 10,
    textAlign: "center",
  },
  crestSmallLogo: {
    height: 30,
    width: 100,
  },
});
