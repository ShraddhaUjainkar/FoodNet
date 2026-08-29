import pino from "pino";
import * as Sentry from "@sentry/node";

const isDev = process.env.NODE_ENV !== "production";

const pinoOpts: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
};

export const logger = pino(pinoOpts);

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
  });
  logger.info("Sentry initialized");
}

export function captureException(err: unknown) {
  try {
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(err);
    }
  } catch (e) {
    // ignore
  }
}

export default logger;
