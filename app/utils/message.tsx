export type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number; // Date.now()
  important: Boolean;
};
