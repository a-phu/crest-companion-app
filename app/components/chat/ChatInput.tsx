import "react-native-get-random-values";
import React, { useState } from "react";
import { StyleSheet, TextInput, View, Pressable, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  useFonts,
  Quicksand_300Light,
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
} from "@expo-google-fonts/quicksand";

type Props = {
  onSend: (text: string) => void;
  onFocusScroll: () => void;
};

function ChatInput({ onSend, onFocusScroll }: Props) {
  const [value, setValue] = useState("");

  const handleSendPress = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue(""); // clear after sending
  };

  let [fontsLoaded] = useFonts({
    Quicksand_300Light,
    Quicksand_400Regular,
    Quicksand_600SemiBold,
    Quicksand_500Medium,
  });

  if (!fontsLoaded) {
    return <Text>Loading...</Text>;
  }

  return (
    <View style={styles.container}>
      {/* <Text>You typed: {text}</Text> */}
      <View style={styles.inputContainer}>
        <TextInput
          placeholder={"Type how you are feeling..."}
          style={styles.textInput}
          onFocus={onFocusScroll}
          value={value}
          onChangeText={setValue} // updates state whenever input changes
          placeholderTextColor="#bebebeff"
        />
        <Pressable
          onPress={handleSendPress}
          disabled={!value.trim()}
          hitSlop={8}
          style={({ pressed }) => [
            // styles.sendBtn,
            pressed && { opacity: 0.7 },
          ]}
        >
          <View style={styles.inputBtnContainer}>
            {value.length === 0 ? (
              <Feather name="mic" size={22} style={styles.inputBtn} />
            ) : (
              <Feather name="arrow-right" size={22} style={styles.inputBtn} />
            )}
          </View>
        </Pressable>
      </View>
    </View>
  );
}

export default ChatInput;

const BAR_HEIGHT = 50;

const styles = StyleSheet.create({
  container: {
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
    paddingLeft: 15,
    paddingRight: 5,
    borderColor: "#bebebeff",
    borderWidth: 2,
    gap: 5,
  },
  inputBtnContainer: {
    flexDirection: "row",
    gap: 5,
  },
  textInput: {
    height: BAR_HEIGHT,
    width: 275,
    fontFamily: "Quicksand_500Medium",
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
