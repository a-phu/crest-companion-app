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

// TODO: work out how to input messages and display them
const ChatbotScreen = () => {
  const [text, setText] = React.useState("");
  const [messages, setMessages] = useState<Message[]>(messageList);

  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
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
          keyboardVerticalOffset={Platform.OS === "ios" ? 50 : 0}
        >
          <ScrollView ref={scrollViewRef} keyboardShouldPersistTaps="handled">
            {messages.map((item, index) => (
              <ChatBubble key={item.id} msg={item} />
            ))}
          </ScrollView>
          <ChatInput onFocusScroll={scrollToBottom} />
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

    marginTop: 50,
    marginBottom: 20,
  },
  title: {
    flexDirection: "row",
    justifyContent: "center",
    textAlign: "center",
  },
  chatContainer: { flex: 1, paddingHorizontal: 10 },
});
