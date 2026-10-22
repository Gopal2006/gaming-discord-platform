import dotenv from "dotenv";
import {
  parseConfig,
  type NexusConfig,
  redactConfig,
  EnvSchema,
} from "./schema.js";

export * from "./schema.js";

/**
 * Loads and validates environment variables from process.env and optional .env file.
 */
export function loadConfig(envFile?: string): NexusConfig {
  if (envFile) {
    dotenv.config({ path: envFile });
  } else {
    dotenv.config();
  }
  return parseConfig(process.env);
}
