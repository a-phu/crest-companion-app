import type { Message } from "../utils/types";
import { StyleSheet, Text, View } from "react-native";

type Props = { msg: Message };

export default function ChatBubble({ msg }: Props) {
  const isUser = msg.role === "user";

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userAlign : styles.companionAlign,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBackground : styles.companionBackground,
        ]}
      >
        <Text
          selectable
          style={[
            styles.messageContent,
            isUser ? styles.userMessage : styles.companionMessage,
          ]}
        >
          {msg.content}
        </Text>
      </View>
      <Text
        style={[styles.date, isUser ? styles.userAlign : styles.companionAlign]}
      >
        {new Date().toLocaleTimeString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-end",
    maxWidth: "85%",
    marginVertical: 6,
    paddingHorizontal: 12,
  },
  userAlign: { alignSelf: "flex-end", marginRight: 8 },
  companionAlign: { alignSelf: "flex-start", marginLeft: 8 },
  userBackground: {
    backgroundColor: "#354F52",
    color: "white",
    borderTopRightRadius: 4,
    borderTopLeftRadius: 16,
  },
  companionBackground: {
    backgroundColor: "#CAD2C5",
    color: "#354F52",
    borderTopRightRadius: 16,
    borderTopLeftRadius: 4,
  },
  userMessage: { color: "white" },
  companionMessage: { color: "#354F52" },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  messageContent: {
    fontSize: 16,
    lineHeight: 22,
  },
  date: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 4,
  },
});
