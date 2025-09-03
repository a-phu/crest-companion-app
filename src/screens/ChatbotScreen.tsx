import React, { useState, useRef } from "react";
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";

import { messageList } from "../store/MessageStore";
import ChatInput from "../components/ChatInput";
import ChatBubble from "../components/ChatBubble";
import type { Message } from "../utils/types";
import { Appbar } from "react-native-paper";

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// TODO: work out how to input messages and display them
const ChatbotScreen = () => {
  const [text, setText] = React.useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  // const [responses]

  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  // Stub for assistant reply (replace with your API call)
  const fetchAssistantReply = async (userText: string): Promise<string> => {
    // Example: call your backend
    // const resp = await fetch("https://your-backend/chat", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ message: userText, history: messages }),
    // });
    // const data = await resp.json();
    // return data.reply;

    // Simulated delay + reply
    return new Promise((resolve) =>
      setTimeout(
        () => resolve(`You said: "${userText}". How can I help next?`),
        600
      )
    );
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

    // Optional: show a “typing…” placeholder
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

  return (
    <SafeAreaProvider style={{ backgroundColor: "#ffffff" }}>
      <SafeAreaView style={styles.container}>
        <Appbar>
          {/* <Appbar.Action icon="menu" /> */}
          <Appbar.Content title="Performance Assistant" style={styles.title} />
        </Appbar>
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          <ScrollView ref={scrollViewRef} keyboardShouldPersistTaps="handled">
            {messages.map((item, index) => (
              <ChatBubble key={item.id} msg={item} />
            ))}
          </ScrollView>
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

    // marginTop: 50,
    marginBottom: 20,
  },
  title: {
    flexDirection: "row",
    justifyContent: "center",
    textAlign: "center",
  },
  chatContainer: { flex: 1, paddingHorizontal: 10 },
});
