import { memo } from "react";
import { View, Text } from "react-native";
import type { Message } from "../types";
import { StyleSheet } from "react-native";

type Props = { msg: Message };

const MessageBubble = ({ msg }: Props) => {
  const isUser = msg.role === "user";

  return (
    <View
      style={{
        alignSelf: isUser ? "flex-end" : "flex-start",
        maxWidth: "85%",
        marginVertical: 6,
        paddingHorizontal: 12,
      }}
      accessibilityRole="text"
      accessibilityLabel={`${msg.role} message`}
    >
      <View
        style={{
          backgroundColor: isUser ? "#2563eb" : "#1f2937",
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 16,
          borderTopRightRadius: isUser ? 4 : 16,
          borderTopLeftRadius: isUser ? 16 : 4,
        }}
      >
        <Text
          style={{ color: "white", fontSize: 16, lineHeight: 22 }}
          selectable
        >
          {msg.content}
        </Text>
      </View>
      <Text
        style={{
          color: "#94a3b8",
          fontSize: 11,
          marginTop: 4,
          alignSelf: isUser ? "flex-end" : "flex-start",
        }}
      >
        {new Date(msg.createdAt).toLocaleTimeString()}
      </Text>
    </View>
  );
};

export default memo(MessageBubble);

const styles = StyleSheet.create({
  surface: {
    padding: 8,
    height: 80,
    width: 80,
    alignItems: "center",
    justifyContent: "center",
  },
});
