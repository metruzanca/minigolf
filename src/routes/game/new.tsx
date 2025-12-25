import { createSignal, For, Show, createEffect } from "solid-js";
import { useNavigate, useAction } from "@solidjs/router";
import { createGame, addPlayer } from "~/api";
import type { RouteDefinition } from "@solidjs/router";
import { addGameCode } from "~/utils/gameStorage";

export const route = {} satisfies RouteDefinition;

type PlayerInput = {
  name: string;
  ballColor: string;
};

export default function NewGame() {
  const navigate = useNavigate();
  const createGameAction = useAction(createGame);
  const addPlayerAction = useAction(addPlayer);
  const [players, setPlayers] = createSignal<PlayerInput[]>([]);
  const [showAddPlayerModal, setShowAddPlayerModal] = createSignal(false);
  const [newPlayerName, setNewPlayerName] = createSignal("");
  const [newPlayerColor, setNewPlayerColor] = createSignal("#FF0000");
  const [isCreating, setIsCreating] = createSignal(false);

  // Focus the input when modal opens
  createEffect(() => {
    if (showAddPlayerModal()) {
      // Use setTimeout to ensure the DOM is updated
      setTimeout(() => {
        const input = document.getElementById(
          "newPlayerName"
        ) as HTMLInputElement;
        if (input) {
          input.focus();
        }
      }, 0);
    }
  });

  const handleAddPlayer = () => {
    const name = newPlayerName().trim();
    if (!name) return;

    setPlayers([...players(), { name, ballColor: newPlayerColor() }]);
    setNewPlayerName("");
    setNewPlayerColor("#FF0000");
    setShowAddPlayerModal(false);
  };

  const handleStartGame = async () => {
    if (players().length === 0) return;

    setIsCreating(true);
    try {
      const game = await createGameAction();

      // Add all players
      for (const player of players()) {
        await addPlayerAction(game.id, player.name, player.ballColor);
      }

      // Add game code to localStorage with timestamp
      addGameCode(game.shortCode, game.createdAt);
      navigate(`/game/${game.shortCode}`);
    } catch (error) {
      console.error("Failed to create game:", error);
      alert("Failed to create game. Please try again.");
      setIsCreating(false);
    }
  };

  return (
    <main class="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div class="max-w-md mx-auto space-y-6">
        <div class="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/")}
            class="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            ← Back
          </button>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            New Game
          </h1>
          <div class="w-16"></div>
        </div>

        <div class="space-y-6">
          <button
            onClick={() => setShowAddPlayerModal(true)}
            class="w-full min-h-[44px] bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Add Player
          </button>

          {players().length > 0 && (
            <div class="space-y-2">
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                Players ({players().length})
              </h2>
              <div class="space-y-2">
                <For each={players()}>
                  {(player, index) => (
                    <div class="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div class="flex items-center gap-3">
                        <div
                          class="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600"
                          style={{ "background-color": player.ballColor }}
                        ></div>
                        <span class="font-medium text-gray-900 dark:text-white">
                          {player.name}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const newPlayers = players().filter(
                            (_, i) => i !== index()
                          );
                          setPlayers(newPlayers);
                        }}
                        class="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </For>
              </div>
            </div>
          )}

          <button
            onClick={handleStartGame}
            disabled={players().length === 0 || isCreating()}
            class="w-full min-h-[44px] bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {isCreating() ? "Creating Game..." : "Start Game"}
          </button>
        </div>
      </div>

      {/* Add Player Modal */}
      <Show when={showAddPlayerModal()}>
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full space-y-4">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">
              Add Player
            </h3>
            <div>
              <label
                for="newPlayerName"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Player Name
              </label>
              <input
                id="newPlayerName"
                type="text"
                value={newPlayerName()}
                onInput={(e) => setNewPlayerName(e.currentTarget.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddPlayer()}
                placeholder="Enter player name"
                class="w-full min-h-[44px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label
                for="newPlayerColor"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Ball Color
              </label>
              <input
                id="newPlayerColor"
                type="color"
                value={newPlayerColor()}
                onInput={(e) => setNewPlayerColor(e.currentTarget.value)}
                class="h-10 w-full border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
              />
            </div>
            <div class="flex gap-3">
              <button
                onClick={() => {
                  setShowAddPlayerModal(false);
                  setNewPlayerName("");
                  setNewPlayerColor("#FF0000");
                }}
                tabindex="-1"
                class="flex-1 min-h-[44px] bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPlayer}
                disabled={!newPlayerName().trim()}
                class="flex-1 min-h-[44px] bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </Show>
    </main>
  );
}
