//backend/src/embedding.ts
import e from "express";
import OpenAI from "openai";
export const EMBED_MODEL = "text-embedding-3-small"; // 1536 dims

export async function embedText(openai: OpenAI, text: string): Promise<number[]> {
  const input = (text || "").slice(0, 8000);
  const { data } = await openai.embeddings.create({ model: EMBED_MODEL, input });
  return data[0].embedding as unknown as number[];
}

export default embedText