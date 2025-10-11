import "dotenv/config"; 
// Load environment variables from backend/.env into process.env
// Example: PORT, OPENAI_API_KEY, AUTH_DISABLED, etc.

import app from "./server";
// Import the Express app that I defined in server.ts
// (server.ts sets up routes and middleware, but does not start listening)

const port = Number(process.env.PORT || 8080);
// Decide which port the server should run on
// - If PORT is set in .env, use that
// - Otherwise default to 8080

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`API listening on http://0.0.0.0:${port}`);
  console.log(`Local: http://localhost:${port}`);
  console.log(`Network: http://192.168.1.103:${port}`);
});
// Start the HTTP server and begin listening for requests
// The callback runs once the server is live, logging a message

function shutdown(signal: string) {
  console.log(`\n${signal} received: closing server...`);
  // This runs when the app is asked to stop (Ctrl+C or cloud shutdown)

  server.close(err => {
    if (err) {
      console.error("Error during server close:", err);
      process.exit(1); // exit with error code if close fails
    }
    console.log("Server closed. Bye!");
    process.exit(0);   // exit normally once server closed cleanly
  });
}

process.on("SIGINT",  () => shutdown("SIGINT"));
// SIGINT = sent when I press Ctrl+C in the terminal
// This lets me shut down gracefully instead of abruptly killing the process
