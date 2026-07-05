import path from "path";
import express from "express";
import { settings } from "./config/settings";
import { migrate } from "./db/database";
import { createLogger } from "./utils/logger";
import { auditRouter } from "./routes/auditRoutes";
import { viewRouter } from "./routes/viewRoutes";

const logger = createLogger("server");

migrate();

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));

app.use(express.json());
app.use("/static", express.static(path.join(__dirname, "..", "public")));

app.use("/api", auditRouter);
app.use("/", viewRouter);

app.use((_req, res) => {
  res.status(404).send("Not found.");
});

app.listen(settings.port, () => {
  logger.info(`Compliance Audit Suite listening on http://localhost:${settings.port}`);
});
