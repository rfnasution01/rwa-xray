import "server-only";

import { z } from "zod";

const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);
const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.url().optional(),
);

const serverEnvSchema = z.object({
  CMC_API_KEY: z.string().min(1),
  CMC_API_BASE_URL: z.url().default("https://pro-api.coinmarketcap.com"),
  DATABASE_URL: z.string().min(1),
  AI_PROVIDER: z.enum(["gemini"]).default("gemini"),
  GEMINI_API_KEY: optionalString,
  SENTRY_DSN: optionalUrl,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

export class ServerEnvironmentError extends Error {
  constructor() {
    super("Server environment configuration is invalid");
    this.name = "ServerEnvironmentError";
  }
}

export function getServerEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv;

  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) throw new ServerEnvironmentError();

  cachedEnv = result.data;
  return cachedEnv;
}
