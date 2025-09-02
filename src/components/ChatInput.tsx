import "react-native-get-random-values";
import React, { useState } from "react";
import {
  Alert,
  Button,
  StyleSheet,
  TextInput,
  View,
  Pressable,
  Text,
} from "react-native";
import { Feather } from "@expo/vector-icons";

type Props = {
  onFocusScroll: () => void;
};

function ChatInput({ onFocusScroll }: Props) {
  const [text, setText] = useState<string>("");

  return (
    <View style={styles.container}>
      {/* <Text>You typed: {text}</Text> */}
      <View style={styles.inputContainer}>
        <TextInput
          placeholder={"Type how you are feeling..."}
          style={styles.textInput}
          onFocus={onFocusScroll}
          value={text}
          onChangeText={setText} // updates state whenever input changes
          placeholderTextColor="#bebebeff"
        />
        <View style={styles.inputBtnContainer}>
          {text.length === 0 ? (
            <Feather name="mic" size={22} style={styles.inputBtn} />
          ) : (
            <Feather name="send" size={22} style={styles.inputBtn} />
          )}
        </View>
      </View>
      <Pressable
        onPress={() => {
          Alert.alert("You tapped the button!");
        }}
        disabled={!text.trim()}
        hitSlop={8}
        style={({ pressed }) => [
          // styles.sendBtn,
          // !text.trim() && { opacity: 0.4 },
          // pressed && { opacity: 0.7 },
        ]}
      >
        {/* <Feather name="send" size={22} style={styles.sendBtn} /> */}
      </Pressable>
    </View>
  );
}

export default ChatInput;

const BAR_HEIGHT = 50;

const styles = StyleSheet.create({
  container: {
    // flex: 1,r
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 5,
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "space-between",
    // width: "90%",
    paddingLeft: 15,
    paddingRight: 5,
    borderColor: "#bebebeff",
    borderWidth: 2,
  },
  inputBtnContainer: {
    flexDirection: "row",
    gap: 5,
  },
  textInput: {
    height: BAR_HEIGHT,
    // color: "#687076",
  },
  inputBtn: {
    padding: 10,
    borderRadius: 30,
    backgroundColor: "#354F52",
    color: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  sendBtnOnClick: {
    backgroundColor: "#354F52",
  },
});
