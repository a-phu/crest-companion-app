import ChatInput from "@/components/ChatInput";
import React, { useRef } from "react";
import {
  ImageBackground,
  InputAccessoryView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
} from "react-native";

export default function ChatbotScreen() {
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  return (
    <ImageBackground
      source={require("@/assets/images/cc-background.png")}
      resizeMode="cover"
      style={styles.background}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          // style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          // keyboardVerticalOffset={Platform.OS === "ios" ? 50 : 0}
        >
          <ScrollView ref={scrollViewRef} keyboardShouldPersistTaps="handled">
            {/* <ChatHistory /> */}
          </ScrollView>
        </KeyboardAvoidingView>

        <InputAccessoryView style={{ height: 44 }}>
          <ChatInput onFocusScroll={scrollToBottom} />
        </InputAccessoryView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    justifyContent: "center",
    // gap: 100,
  },

  text: {
    color: "white",
    fontSize: 42,
    lineHeight: 84,
    fontWeight: "bold",
    textAlign: "center",
    backgroundColor: "#000000c0",
  },
});
