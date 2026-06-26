import app from "./app";
import { logger } from "./lib/logger";
import { bootstrapIfEmpty } from "@workspace/db/bootstrap";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  logger.warn(
    "GOOGLE_CLIENT_ID and/or GOOGLE_CLIENT_SECRET are not set — Google OAuth sign-in will be unavailable. " +
    "Configure these secrets in Replit to enable Google sign-in."
  );
}

async function start() {
  try {
    await bootstrapIfEmpty();
  } catch (err) {
    logger.error({ err }, "[bootstrap] Failed to bootstrap database — server will start anyway");
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}

start();
