import React, { useState, useRef } from "react";
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";

import { messageList } from "../store/MessageStore";
import MessageInputBar from "../components/MessageInput";
import MessageBubble from "../components/MessageBubble";
import type { Message } from "../utils/types";

// TODO: work out how to input messages and display them
const ChatbotScreen = () => {
  const [text, setText] = React.useState("");
  const [messages, setMessages] = useState<Message[]>(messageList);

  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 50 : 0}
        >
          <ScrollView ref={scrollViewRef} keyboardShouldPersistTaps="handled">
            {/* {messages.map((item, index) => (
              <MessageBubble key={item.id} msg={item} />
            ))} */}
          </ScrollView>
          <MessageInputBar onFocusScroll={scrollToBottom} />
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
    paddingHorizontal: 20,
    marginTop: 50,
    marginBottom: 20,
  },
});
