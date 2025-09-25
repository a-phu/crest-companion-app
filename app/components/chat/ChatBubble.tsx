import type { Message } from "../../utils/message";
import { StyleSheet, View } from "react-native";
import Markdown from "react-native-markdown-display";

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
        <Markdown style={markdownStyles}>{msg.content}</Markdown>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-end",
    marginVertical: 6,
    paddingHorizontal: 12,
  },
  userAlign: { alignSelf: "flex-end", marginRight: 8, maxWidth: "85%" },
  companionAlign: { alignSelf: "flex-start", marginLeft: 8, width: "95%" },
  userBackground: {
    backgroundColor: "#50726A",
    borderTopRightRadius: 4,
    borderTopLeftRadius: 16,
  },
  companionBackground: {
    // backgroundColor: "#ffffff5e",
    // borderTopRightRadius: 16,
    // borderTopLeftRadius: 4,
  },
  bubble: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  messageContent: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: 400,
  },
  date: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 4,
  },
});

const markdownStyles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 22, fontWeight: 400, color: "#fff" },
  heading1: { fontSize: 24, color: "#fff" },
  strong: { color: "#fff" }, // bold text
  em: { fontStyle: "italic", color: "#fff" }, // italic
  list_item: { marginVertical: 4 },
});
