const STORAGE_KEY = "minigolf_game_codes";

/**
 * Get all stored game codes from localStorage
 */
export function getStoredGameCodes(): string[] {
  if (typeof window === "undefined") return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const codes = JSON.parse(stored);
    return Array.isArray(codes) ? codes : [];
  } catch {
    return [];
  }
}

/**
 * Add a game code to localStorage
 */
export function addGameCode(code: string): void {
  if (typeof window === "undefined") return;
  
  try {
    const codes = getStoredGameCodes();
    // Use Set to avoid duplicates, then convert back to array
    const codeSet = new Set(codes);
    codeSet.add(code);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(codeSet)));
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
    const codes = getStoredGameCodes();
    const filtered = codes.filter((c) => c !== code);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to remove game code from localStorage:", error);
  }
}

