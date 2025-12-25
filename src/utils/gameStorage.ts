const STORAGE_KEY = "minigolf_game_codes";

type StoredGame = {
  code: string;
  createdAt: string; // ISO string
};

/**
 * Get all stored game codes from localStorage
 */
export function getStoredGameCodes(): StoredGame[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const data = JSON.parse(stored);

    // Handle migration from old format (array of strings)
    if (Array.isArray(data)) {
      if (data.length === 0) return [];
      // Check if it's old format (strings) or new format (objects)
      if (typeof data[0] === "string") {
        // Migrate old format to new format
        const migrated: StoredGame[] = data.map((code: string) => ({
          code,
          createdAt: new Date().toISOString(), // Use current time as fallback
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
    }

    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Add a game code to localStorage with timestamp
 */
export function addGameCode(code: string, createdAt?: Date | string): void {
  if (typeof window === "undefined") return;

  try {
    const games = getStoredGameCodes();
    const timestamp = createdAt
      ? typeof createdAt === "string"
        ? createdAt
        : createdAt.toISOString()
      : new Date().toISOString();

    // Remove existing entry with same code if it exists
    const filtered = games.filter((g) => g.code !== code);

    // Add new entry
    filtered.push({ code, createdAt: timestamp });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to save game code to localStorage:", error);
  }
}

/**
 * Remove a game code from localStorage
 */
export function removeGameCode(code: string): void {
  if (typeof window === "undefined") return;

  try {
    const games = getStoredGameCodes();
    const filtered = games.filter((g) => g.code !== code);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to remove game code from localStorage:", error);
  }
}
