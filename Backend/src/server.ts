import "dotenv/config";
import express from "express";
import cors from "cors";

import messages from "./routes/messages";
import chat from "./routes/chat";
import debugRoutes from "./routes/debug"; // ← add this
import program from "./routes/programs"; // <- if you have a programs route
import insights from "./routes/insights"; // <- if you have a programs route
const app = express();
app.use(cors());
app.use(express.json());

// tiny logger so you see every request
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/messages", messages);
app.use("/api/chat", chat);
app.use("/api/debug", debugRoutes);
app.use("/api/insights", insights);
app.use("api/programs", program); // <- if you have a programs route

// optional: route inspector to confirm what's mounted
app.get("/__debug/routes", (_req, res) => {
  const seen: Array<{ path: string; methods: string[] }> = [];
  function walk(stack: any[]) {
    for (const layer of stack) {
      if (layer.route?.path)
        seen.push({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods || {}),
        });
      else if (layer.name === "router" && layer.handle?.stack)
        walk(layer.handle.stack);
    }
  }
  // @ts-ignore
  if ((app as any)._router?.stack) walk((app as any)._router.stack);
  res.json(seen);
});

// 404 MUST be last
app.use((req, res) =>
  res.status(404).json({ error: "Not Found", path: req.originalUrl })
);

const port = Number(process.env.PORT || 8080);
app.listen(port, () =>
  console.log(`API listening on http://localhost:${port}`)
);
