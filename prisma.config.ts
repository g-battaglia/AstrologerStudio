/**
 * Prisma Configuration for Astrologer Studio
 *
 * This configuration file is used by Prisma CLI to determine:
 * - Which schema file to use
 * - Where migrations are stored
 * - How to connect to the database
 *
 * @see https://www.prisma.io/docs/orm/prisma-schema/overview/configuration
 */
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  // PostgreSQL schema - standard location
  schema: "prisma/schema.prisma",

  // Migrations directory
  migrations: {
    path: "prisma/migrations",
  },

  // Database connection
  datasource: {
    // Using process.env directly to avoid errors when DATABASE_URL is not set
    // (e.g., during `prisma generate` in CI without a database)
    url: process.env.DATABASE_URL ?? "",
  },
});
