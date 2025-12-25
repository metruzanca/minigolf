import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";

export const Users = sqliteTable("users", {
  id: integer("id").primaryKey().unique().notNull(),
  username: text("username").notNull().default(""),
  password: text("password").notNull().default(""),
});

export const Games = sqliteTable("games", {
  id: integer("id").primaryKey().unique().notNull(),
  shortCode: text("shortCode").notNull().unique(),
  numHoles: integer("numHoles").notNull(),
  currentHole: integer("currentHole").notNull().default(1),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const Players = sqliteTable("players", {
  id: integer("id").primaryKey().unique().notNull(),
  gameId: integer("gameId")
    .notNull()
    .references(() => Games.id),
  name: text("name").notNull(),
  ballColor: text("ballColor").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const Scores = sqliteTable("scores", {
  id: integer("id").primaryKey().unique().notNull(),
  playerId: integer("playerId")
    .notNull()
    .references(() => Players.id),
  gameId: integer("gameId")
    .notNull()
    .references(() => Games.id),
  holeNumber: integer("holeNumber").notNull(),
  score: integer("score").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
