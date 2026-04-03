import { defineConfig } from "prisma/config";

// Load .env for local dev only; in Docker env vars come from docker-compose env_file
if (process.env.NODE_ENV !== "production") {
  try { require("dotenv").config(); } catch {}
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
