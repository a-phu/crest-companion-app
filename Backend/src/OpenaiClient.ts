
import OpenAI from "openai";

// This creates a client using the secret API key from .env
export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
