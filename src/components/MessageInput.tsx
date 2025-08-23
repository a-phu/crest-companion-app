import "react-native-get-random-values";
import React, { useState } from "react";
import { Alert, Button, StyleSheet, TextInput, View } from "react-native";

type Props = {
  onFocusScroll: () => void;
};

function MessageInputBar({ onFocusScroll }: Props) {
  const [text, setText] = useState<string>("");

  return (
    <View style={[styles.textInputContainer]}>
      <TextInput
        style={[styles.textInput]}
        onChangeText={setText}
        value={text}
        placeholder={"Ask anything"}
        autoFocus={true}
        underlineColorAndroid={"transparent"}
        onFocus={onFocusScroll}
      />
      <Button
        onPress={() => {
          Alert.alert("You tapped the button!");
        }}
        title="Send"
      />
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
    flexDirection: "row",
    alignItems: "center",
    height: BAR_HEIGHT,
    backgroundColor: "#ffffff",
    marginVertical: 10,
    borderRadius: 20,
    paddingHorizontal: 10,
  },
});
