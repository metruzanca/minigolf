import { A, useNavigate } from "@solidjs/router";
import type { RouteDefinition } from "@solidjs/router";
import { createSignal, For, onMount } from "solid-js";
import { getStoredGameCodes, removeGameCode } from "~/utils/gameStorage";

export const route = {} satisfies RouteDefinition;

export default function Home() {
  const navigate = useNavigate();
  const [storedGameCodes, setStoredGameCodes] = createSignal<
    Array<{ code: string; createdAt: string }>
  >([]);

  // Load stored game codes on mount
  onMount(() => {
    setStoredGameCodes(getStoredGameCodes());
  });

  const handleRemoveGameCode = (code: string) => {
    removeGameCode(code);
    setStoredGameCodes(getStoredGameCodes());
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      // For older dates, show formatted date
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    } catch {
      return "";
    }
  };

  return (
    <main class="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div class="max-w-md w-full space-y-8">
        <div class="text-center">
          <h1 class="text-4xl font-bold text-gray-900 mb-2">
            Minigolf Tracker
          </h1>
          <p class="text-gray-600">Track your minigolf scores</p>
        </div>
        <button
          onClick={() => navigate("/game/new")}
          class="w-full min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Create New Game
        </button>

        {/* Stored Game Codes */}
        {storedGameCodes().length > 0 && (
          <div class="bg-white border border-gray-200 rounded-lg p-4">
            <h2 class="text-lg font-semibold text-gray-900 mb-3">
              Recent Games
            </h2>
            <div class="space-y-2">
              <For each={storedGameCodes()}>
                {(game) => (
                  <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <button
                      onClick={() => navigate(`/game/${game.code}`)}
                      class="flex-1 text-left"
                    >
                      <div class="font-mono font-semibold text-blue-600 hover:text-blue-700">
                        {game.code}
                      </div>
                      <div class="text-xs text-gray-500 mt-1">
                        {formatDate(game.createdAt)}
                      </div>
                    </button>
                    <button
                      onClick={() => handleRemoveGameCode(game.code)}
                      class="text-red-600 hover:text-red-700 text-sm font-medium px-2"
                      aria-label="Remove game code"
                    >
                      ×
                    </button>
                  </div>
                )}
              </For>
            </div>
          </div>
        )}
      </div>
      <div class="mt-auto pt-8 pb-4 text-center text-sm text-gray-500">
        Made with <span class="text-red-400">♥</span> by{" "}
        <a
          href="https://github.com/metruzanca"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-600 hover:text-blue-700 underline"
        >
          metruzanca
        </a>
      </div>
    </main>
  );
}
