import express from "express";
import cors from "cors";
import morgan from "morgan";
import { openai } from "./OpenaiClient";

// This file defines the Express app but doesn't start it.
const app = express();

// 1) Enable CORS
// Without this, the Expo frontend would be blocked by the browser’s same-origin policy.
app.use(cors());

// 2) Parse JSON bodies
// When a client sends JSON (e.g. { "name": "Nas" }),
// this middleware automatically makes it available in req.body.
app.use(express.json());

// 3) Log requests
// Every time someone calls an endpoint, I’ll see it in the console.
// Example: GET /health 200 3ms
app.use(morgan("dev"));

// 4) Add a route
// If someone does GET http://localhost:8080/health,
// the server responds with JSON { ok: true }.
// This is just a "ping" to check if the API is alive.
app.get("/health", (_req, res) => res.json({ ok: true }));


// Chat endpoint: forwards messages to OpenAI
// Define a POST endpoint at /api/chat
// The frontend (Expo app) will call this route to send messages to OpenAI
app.post("/api/chat", async (req, res) => {
  try {
    // Pull the "messages" field from the request body.
    // Expected shape: { messages: [ { role: "user", content: "Hello!" } ] }
    const { messages } = req.body;

    // Make sure "messages" is actually an array.
    // If not, send back a 400 Bad Request to the client.
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "Missing messages array" });
    }

    // Call OpenAI's Chat Completion API.
    // - model: tells OpenAI which language model to use
    // - messages: the conversation so far (system/user/assistant turns)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // using the lightweight, fast model
      messages,
    });

    // Send back the first reply from OpenAI to the client in JSON format.
    // Example response shape:
    // { reply: { role: "assistant", content: "Hi there! How can I help you today?" } }
    res.json({ reply: completion.choices[0].message });
  } catch (err: any) {
    // If something goes wrong (bad API key, network issue, etc.):
    // - log the error to the server console
    // - send a 500 Internal Server Error back to the client
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// Export the app so other files (like index.ts or tests) can use it.
export default app;