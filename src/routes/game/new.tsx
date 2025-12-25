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
      console.log("Creating game");
      const game = await createGameAction();

      console.log("Game created:", game);
      // Add all players
      for (const player of players()) {
        console.log(
          "Adding player",
          player.name,
          "with color",
          player.ballColor
        );
        await addPlayerAction(game.id, player.name, player.ballColor);
      }

      console.log("Navigating to game", game.shortCode);
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
    <main class="min-h-screen bg-gray-50 p-4">
      <div class="max-w-md mx-auto space-y-6">
        <div class="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/")}
            class="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back
          </button>
          <h1 class="text-2xl font-bold text-gray-900">New Game</h1>
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
              <h2 class="text-lg font-semibold text-gray-900">
                Players ({players().length})
              </h2>
              <div class="space-y-2">
                <For each={players()}>
                  {(player, index) => (
                    <div class="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                      <div class="flex items-center gap-3">
                        <div
                          class="w-6 h-6 rounded-full border-2 border-gray-300"
                          style={{ "background-color": player.ballColor }}
                        ></div>
                        <span class="font-medium text-gray-900">
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
                        class="text-red-600 hover:text-red-700 text-sm font-medium"
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
            class="w-full min-h-[44px] bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {isCreating() ? "Creating Game..." : "Start Game"}
          </button>
        </div>
      </div>

      {/* Add Player Modal */}
      <Show when={showAddPlayerModal()}>
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div class="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
            <h3 class="text-xl font-bold text-gray-900">Add Player</h3>
            <div>
              <label
                for="newPlayerName"
                class="block text-sm font-medium text-gray-700 mb-2"
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
                class="w-full min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label
                for="newPlayerColor"
                class="block text-sm font-medium text-gray-700 mb-2"
              >
                Ball Color
              </label>
              <input
                id="newPlayerColor"
                type="color"
                value={newPlayerColor()}
                onInput={(e) => setNewPlayerColor(e.currentTarget.value)}
                class="h-10 w-full border border-gray-300 rounded cursor-pointer"
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
                class="flex-1 min-h-[44px] bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPlayer}
                disabled={!newPlayerName().trim()}
                class="flex-1 min-h-[44px] bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
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
