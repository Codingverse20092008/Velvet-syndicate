import dotenv from "dotenv";
import { z } from "zod";
import { defineConfig } from "drizzle-kit";

// Force loading .env.local as Next.js does
dotenv.config({ path: ".env.local" });

// Env validation
const env = z.object({
  TURSO_DATABASE_URL: z.string().url(),
  TURSO_AUTH_TOKEN: z.string().min(1),
}).parse(process.env);

export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dialect: "turso", // Using 'turso' to support authToken for remote libSQL
  dbCredentials: {
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  },
});