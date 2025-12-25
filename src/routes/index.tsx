import { A, useNavigate } from "@solidjs/router";
import type { RouteDefinition } from "@solidjs/router";
import { createSignal, For, onMount } from "solid-js";
import { getStoredGameCodes, removeGameCode } from "~/utils/gameStorage";

export const route = {} satisfies RouteDefinition;

export default function Home() {
  const navigate = useNavigate();
  const [storedGameCodes, setStoredGameCodes] = createSignal<string[]>([]);

  // Load stored game codes on mount
  onMount(() => {
    setStoredGameCodes(getStoredGameCodes());
  });

  const handleRemoveGameCode = (code: string) => {
    removeGameCode(code);
    setStoredGameCodes(getStoredGameCodes());
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
                {(code) => (
                  <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <button
                      onClick={() => navigate(`/game/${code}`)}
                      class="flex-1 text-left font-mono font-semibold text-blue-600 hover:text-blue-700"
                    >
                      {code}
                    </button>
                    <button
                      onClick={() => handleRemoveGameCode(code)}
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
