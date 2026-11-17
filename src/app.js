import express from "express";
import { fileURLToPath } from "node:url";
import productsRouter from "./routes/products.routes.js";

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(2)}ms`,
    );
  });

  next();
});

app.use(express.static(fileURLToPath(new URL("../public/", import.meta.url))));

app.get("/api/health", (req, res) => {
  res.json({ data: { status: "ok", uptime: process.uptime() } });
});

app.use("/api/products", productsRouter);

app.use((req, res) => {
  res.status(404).json({ error: { message: "Not found" } });
});

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: { message: err.message || "Internal server error" } });
});

export default app;
