import { A, useNavigate } from "@solidjs/router";
import type { RouteDefinition } from "@solidjs/router";

export const route = {} satisfies RouteDefinition;

export default function Home() {
  const navigate = useNavigate();
  
  return (
    <main class="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div class="max-w-md w-full space-y-8">
        <div class="text-center">
          <h1 class="text-4xl font-bold text-gray-900 mb-2">Minigolf Tracker</h1>
          <p class="text-gray-600">Track your minigolf scores</p>
        </div>
        <button
          onClick={() => navigate("/game/new")}
          class="w-full min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Create New Game
        </button>
      </div>
    </main>
  );
}
