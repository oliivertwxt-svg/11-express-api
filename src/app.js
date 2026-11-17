import express from "express";
import { fileURLToPath } from "node:url";
import HttpError from "./errors/http-error.js";
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
  throw new HttpError(404, "Not found");
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    console.error(err.stack || err);
  }

  const message =
    isProduction && status >= 500
      ? "Internal server error"
      : err.message || "Internal server error";
  const error = { message };

  if (err.fields) {
    error.fields = err.fields;
  }

  return res.status(status).json({ error });
});

export default app;
