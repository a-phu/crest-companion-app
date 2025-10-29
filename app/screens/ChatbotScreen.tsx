import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Platform,
  Text,
  ActivityIndicator,
  View,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import ChatInput from "../components/chat/ChatInput";
import ChatBubble from "../components/chat/ChatBubble";
import type { Message } from "../utils/message";
import CrestAppBar from "../components/CrestAppBar";
import MessageHistory from "../utils/messageHistory";

import {
  useFonts,
  Quicksand_300Light,
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
} from "@expo-google-fonts/quicksand";
import {
  Raleway_600SemiBold,
  Raleway_500Medium_Italic,
  Raleway_500Medium,
} from "@expo-google-fonts/raleway";
import api from "../scripts/axiosClient";
import { HUMAN_ID, AI_ID } from "../../defaultIds";
// UUIDs for identifying user vs. assistant

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const ChatbotScreen = () => {
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);

  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const fetchChatHistory = async (): Promise<Message[]> => {
    try {
      //   const response = await api.get<MessageHistory[]>(`/messages/thread`);
      //   return response.data.map((msg: any) => new MessageHistory(msg));
      // } catch (error) {
      //   console.error("Error fetching thread messages:", error);
      //   throw error;
      // }

      const response = await api.get(`/messages/thread`);

      // Map backend JSON → frontend Message[]
      const messages: Message[] = response.data.map((item: any) => {
        const role =
          item.sender_id === HUMAN_ID
            ? "user"
            : item.sender_id === AI_ID
              ? "assistant"
              : "system";

        return {
          id: item.message_id,
          role,
          content: item.content,
          createdAt: new Date(item.created_at).getTime(),
          isImportant: item.is_important,
        };
      });

      return messages;
    } catch (error) {
      console.error("Error fetching thread messages:", error);
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
      isImportant: false,
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
        content: "", // or "Assistant is typing"
        createdAt: Date.now(),
        isImportant: false,
      },
    ]);

    try {
      setLoading(true);
      const reply = await fetchAssistantReply(trimmed);

      // Replace the typing bubble with the real reply
      setMessages((prev) =>
        prev.map((m) =>
          m.id === typingId
            ? {
                ...m,
                content: reply,
                createdAt: Date.now(),
                isImportant: false,
              }
            : m
        )
      );
      setLoading(false);
      // await api.post("/insights/generate"); // always generate new insights after each message
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
    } finally {
      setLoading(false);
    }
  };

  // Stub for assistant reply (replace with API call)
  const fetchAssistantReply = async (message: string): Promise<string> => {
    try {
      const response = await api.post("/chat", { text: message });
      const isImportant = JSON.stringify(response.data.meta);
      console.log(`is important: ${isImportant}`);
      const important = response.data.meta.userImportance.important;
      console.log(`is important value: ${important}`);
      // if (important == true) api.post("/insights/generate");
      return response.data.reply;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  };

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const data = await fetchChatHistory();
        setMessages(data);
      } catch {
        console.log("Failed to load messages");
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timeout);
  }, [messages]);

  let [fontsLoaded] = useFonts({
    Quicksand_300Light,
    Quicksand_400Regular,
    Quicksand_600SemiBold,
    Quicksand_500Medium,
    Raleway_600SemiBold,
    Raleway_500Medium_Italic,
    Raleway_500Medium,
  });

  if (!fontsLoaded) {
    return <Text>Loading...</Text>;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <CrestAppBar
          heading={"Let’s Get to Work"}
          subtitle={"Let’s keep building together."}
        />
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
          {loading && (
            <View
              style={{ padding: 10, alignItems: "center", marginBottom: 250 }}
            >
              <ActivityIndicator size="small" color="#fff" />
            </View>
          )}
          <Text style={styles.viewNextScreenText}>View Today’s Insights →</Text>
          <ChatInput onSend={handleSend} onFocusScroll={scrollToBottom} />
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
  viewNextScreenText: {
    fontFamily: "Raleway_500Medium_Italic",
    color: "white",
    textAlign: "center",
    marginVertical: 10,
    fontSize: 16,
  },
});
