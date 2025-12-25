"use server";
import { redirect } from "@solidjs/router";
import { useSession } from "vinxi/http";
import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { Users, Games, Players, Scores } from "../../drizzle/schema";

function validateUsername(username: unknown) {
  if (typeof username !== "string" || username.length < 3) {
    return `Usernames must be at least 3 characters long`;
  }
}

function validatePassword(password: unknown) {
  if (typeof password !== "string" || password.length < 6) {
    return `Passwords must be at least 6 characters long`;
  }
}

async function login(username: string, password: string) {
  const user = db
    .select()
    .from(Users)
    .where(eq(Users.username, username))
    .get();
  if (!user || password !== user.password) throw new Error("Invalid login");
  return user;
}

async function register(username: string, password: string) {
  const existingUser = db
    .select()
    .from(Users)
    .where(eq(Users.username, username))
    .get();
  if (existingUser) throw new Error("User already exists");
  return db.insert(Users).values({ username, password }).returning().get();
}

function getSession() {
  return useSession({
    password:
      process.env.SESSION_SECRET ?? "areallylongsecretthatyoushouldreplace",
  });
}

export async function loginOrRegister(formData: FormData) {
  const username = String(formData.get("username"));
  const password = String(formData.get("password"));
  const loginType = String(formData.get("loginType"));
  let error = validateUsername(username) || validatePassword(password);
  if (error) return new Error(error);

  try {
    const user = await (loginType !== "login"
      ? register(username, password)
      : login(username, password));
    const session = await getSession();
    await session.update((d) => {
      d.userId = user.id;
    });
  } catch (err) {
    return err as Error;
  }
  throw redirect("/");
}

export async function logout() {
  const session = await getSession();
  await session.update((d) => (d.userId = undefined));
  throw redirect("/login");
}

export async function getUser() {
  const session = await getSession();
  const userId = session.data.userId;
  if (userId === undefined) throw redirect("/login");

  try {
    const user = db.select().from(Users).where(eq(Users.id, userId)).get();
    if (!user) throw redirect("/login");
    return { id: user.id, username: user.username };
  } catch {
    throw logout();
  }
}

// Game-related functions
function generateShortCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createGame() {
  try {
    let shortCode = generateShortCode();
    let attempts = 0;

    // Check for collisions (max 10 attempts)
    while (attempts < 10) {
      const existing = db
        .select()
        .from(Games)
        .where(eq(Games.shortCode, shortCode))
        .get();
      if (!existing) break;
      shortCode = generateShortCode();
      attempts++;
    }

    if (attempts >= 10) {
      throw new Error("Failed to generate unique short code");
    }

    const game = db
      .insert(Games)
      .values({
        shortCode,
        numHoles: 1, // Start with 1 hole, add more as needed
        currentHole: 1,
      })
      .returning()
      .get();

    return game;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to create game");
  }
}

export async function getGame(shortCode: string) {
  const game = db
    .select()
    .from(Games)
    .where(eq(Games.shortCode, shortCode))
    .get();
  if (!game) {
    throw new Error("Game not found");
  }

  const players = db
    .select()
    .from(Players)
    .where(eq(Players.gameId, game.id))
    .all();
  const scores = db
    .select()
    .from(Scores)
    .where(eq(Scores.gameId, game.id))
    .all();

  return {
    ...game,
    players,
    scores,
  };
}

export async function addPlayer(
  gameId: number,
  name: string,
  ballColor: string
) {
  const player = db
    .insert(Players)
    .values({
      gameId,
      name,
      ballColor,
    })
    .returning()
    .get();

  return player;
}

export async function addScore(
  playerId: number,
  gameId: number,
  holeNumber: number,
  score: number
) {
  // Check if score already exists for this player/hole
  const existing = db
    .select()
    .from(Scores)
    .where(
      and(
        eq(Scores.playerId, playerId),
        eq(Scores.gameId, gameId),
        eq(Scores.holeNumber, holeNumber)
      )
    )
    .get();

  if (existing) {
    // Update existing score
    return db
      .update(Scores)
      .set({ score })
      .where(eq(Scores.id, existing.id))
      .returning()
      .get();
  } else {
    // Insert new score
    return db
      .insert(Scores)
      .values({
        playerId,
        gameId,
        holeNumber,
        score,
      })
      .returning()
      .get();
  }
}

export async function updateCurrentHole(gameId: number, holeNumber: number) {
  return db
    .update(Games)
    .set({ currentHole: holeNumber })
    .where(eq(Games.id, gameId))
    .returning()
    .get();
}

export async function getAverageScoreForHole(
  gameId: number,
  holeNumber: number
): Promise<number> {
  const scores = db
    .select()
    .from(Scores)
    .where(and(eq(Scores.gameId, gameId), eq(Scores.holeNumber, holeNumber)))
    .all();

  if (scores.length === 0) return 0;

  const sum = scores.reduce((acc, s) => acc + s.score, 0);
  return Math.floor(sum / scores.length);
}

export async function addHole(gameId: number) {
  const game = db
    .select()
    .from(Games)
    .where(eq(Games.id, gameId))
    .get();
  
  if (!game) {
    throw new Error("Game not found");
  }

  const newHoleNumber = game.numHoles + 1;
  
  return db
    .update(Games)
    .set({ 
      numHoles: newHoleNumber,
      currentHole: newHoleNumber 
    })
    .where(eq(Games.id, gameId))
    .returning()
    .get();
}
