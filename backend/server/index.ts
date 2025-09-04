import { configDotenv } from "dotenv";
import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "./lib/passport";
import router from "./routes";
import client from "prom-client";

configDotenv();
const app = express();
const PORT = parseInt(process.env.PORT || '3001');

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

app.use((req, res, next) => {
  const startTime = Date.now();

  const {
    httpRequestDuration,
    httpRequestTotal,
  } = require("./metrics/prometheus");

  const originalEnd = res.end.bind(res);

  res.end = function (...args: any[]) {
    const duration = (Date.now() - startTime) / 1000;
    const statusCode = res.statusCode.toString();
    const method = req.method;
    const route = req.route?.path || req.path || "unknown";

    httpRequestDuration.labels(method, route, statusCode).observe(duration);

    httpRequestTotal.labels(method, route, statusCode).inc();

    return originalEnd(...args);
  } as any;

  next();
});

app.get("/metrics", async (req, res) => {
  try {
    res.setHeader("Content-Type", client.register.contentType);
    const metrics = await client.register.metrics();
    res.send(metrics);
  } catch (ex) {
    res.status(500).end(ex);
  }
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "1.0.0",
  });
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL
        : "http://localhost:3002",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.use("/api/v1/", router);

app.listen(PORT, () => {
  console.log(`server is running at http://localhost:${PORT}/`);
  console.log(`metrics available at http://localhost:${PORT}/metrics`);
  console.log(`health check available at http://localhost:${PORT}/health`);
});
