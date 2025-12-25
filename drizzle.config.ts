export default {
  dialect: "sqlite",
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations/",
  dbCredentials: {
    url: "file:./drizzle/db.sqlite",
  },
};
