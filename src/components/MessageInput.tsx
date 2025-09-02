import "react-native-get-random-values";
import React, { useState } from "react";
import {
  Alert,
  Button,
  StyleSheet,
  TextInput,
  View,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";

type Props = {
  onFocusScroll: () => void;
};

function MessageInputBar({ onFocusScroll }: Props) {
  const [text, setText] = useState<string>("");

  return (
    <View style={[styles.messageInputContainer]}>
      <View style={[styles.textInputContainer]}>
        <TextInput
          style={[styles.textInput]}
          onChangeText={setText}
          value={text}
          placeholder={"Ask anything"}
          // autoFocus={true}
          underlineColorAndroid={"transparent"}
          onFocus={onFocusScroll}
        />
        <Feather name="mic" size={22} />
      </View>
      <Pressable
        onPress={() => {
          Alert.alert("You tapped the button!");
        }}
        disabled={!text.trim()}
        hitSlop={8}
        style={({ pressed }) => [
          styles.sendBtn,
          !text.trim() && { opacity: 0.4 },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Feather name="send" size={22} />
      </Pressable>
    </View>
  );
}

export default MessageInputBar;

const BAR_HEIGHT = 44;

const styles = StyleSheet.create({
  textInput: {
    flex: 1,
    paddingLeft: 10,
  },
  textInputContainer: {
    // flexDirection: "row",
    // alignItems: "center",
    height: BAR_HEIGHT,
    backgroundColor: "#ffffff",
    marginVertical: 10,
    borderRadius: 20,
    paddingHorizontal: 10,
    width: "90%",
  },
  sendBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#354F52",
  },
  messageInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: BAR_HEIGHT,
    gap: 5,
  },
});
