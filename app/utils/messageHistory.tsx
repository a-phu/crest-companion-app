export default class MessageHistory {
  messageId: string;
  senderId: string;
  receiverId: string;
  content: string;
  isImportant: boolean;
  createdAt: Date;
  agentType: string;
  role: "user" | "assistant";

  constructor(data: any) {
    this.messageId = data.message_id;
    this.senderId = data.sender_id;
    this.receiverId = data.receiver_id;
    this.content = data.content;
    this.isImportant = data.is_important;
    this.createdAt = new Date(data.created_at);
    this.agentType = data.agent_type;
    // derive role based on sender
    this.role =
      this.senderId === "b9576a32-334b-4444-866e-4ec176d377ff"
        ? "user"
        : "assistant";
  }

  isUser(): boolean {
    return this.senderId === "b9576a32-334b-4444-866e-4ec176d377ff";
  }

  getBubbleColor(): string {
    return this.isUser() ? "#1E90FF" : "#000000"; // Blue for user, black for AI
  }

  getTextColor(): string {
    return "#FFFFFF";
  }

  getAlignment(): "flex-start" | "flex-end" {
    return this.isUser() ? "flex-end" : "flex-start";
  }
}
