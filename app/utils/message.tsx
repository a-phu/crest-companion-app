export type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number; // Date.now()
  isImportant: boolean;
};

// export class MessageResponse {
//   content: string;
//    isImportant: boolean;

//   constructor(data: any) {
//     this.name = data.name;
//     this.metrics = new Metrics(data.metrics);
//     this.description = data.description;
//   }
// }
