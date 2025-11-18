import { defineConfig } from "drizzle-kit";
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  schema: "./drizzle/sqlite-schema.ts",
  out: "./drizzle/migrations",
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || './local.db',
  },
});
