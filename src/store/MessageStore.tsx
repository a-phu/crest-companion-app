import { v4 as uuidv4 } from "uuid";
import type { Message } from "../utils/types";
import "react-native-get-random-values";
// TODO: set up store for storing actual messages
export const messageList: Message[] = [
  {
    id: "sys-hello",
    role: "assistant",
    content: "Hi! I’m your wellness coach. How can I help today?",
    createdAt: Date.now(),
  },
  {
    id: uuidv4(),
    role: "user",
    content: `This morning I woke up feeling so foggy. Couldn’t get to sleep until 1:30am again. I just lay there overthinking everything. Racing thoughts, and started to spiralling. I’ve been short, moody and lots of head noise. I don’t want to feel like this!`,
    createdAt: Date.now(),
  },
  {
    id: uuidv4(),
    role: "assistant",
    content: `Multiple signals show you're overloaded: poor sleep, skipped meals, and negative self-talk. Let’s stabilise first — no pressure to fix everything. You need clarity, not pressure. Here is a quick fix to calm your nervous system. Do this 3 min breathwork, and report back to me. You have got this, and you are not alone.`,
    createdAt: Date.now(),
  },
  {
    id: uuidv4(),
    role: "user",
    content: `AHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH`,
    createdAt: Date.now(),
  },
  {
    id: uuidv4(),
    role: "assistant",
    content: `AHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH`,
    createdAt: Date.now(),
  },
];
