import { createSignal, For } from "solid-js";
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
  const [currentPlayerName, setCurrentPlayerName] = createSignal("");
  const [currentPlayerColor, setCurrentPlayerColor] = createSignal("#FF0000");
  const [isCreating, setIsCreating] = createSignal(false);

  const handleAddPlayer = () => {
    const name = currentPlayerName().trim();
    if (!name) return;

    setPlayers([...players(), { name, ballColor: currentPlayerColor() }]);
    setCurrentPlayerName("");
    setCurrentPlayerColor("#FF0000");
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
          <div>
            <label
              for="playerName"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Player Name
            </label>
            <input
              id="playerName"
              type="text"
              value={currentPlayerName()}
              onInput={(e) => setCurrentPlayerName(e.currentTarget.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddPlayer()}
              placeholder="Enter player name"
              class="w-full min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
            />
            <div class="flex items-center gap-4 mb-3">
              <label
                for="ballColor"
                class="block text-sm font-medium text-gray-700"
              >
                Ball Color
              </label>
              <input
                id="ballColor"
                type="color"
                value={currentPlayerColor()}
                onInput={(e) => setCurrentPlayerColor(e.currentTarget.value)}
                class="h-10 w-20 border border-gray-300 rounded cursor-pointer"
              />
            </div>
            <button
              onClick={handleAddPlayer}
              disabled={!currentPlayerName().trim()}
              class="w-full min-h-[44px] bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Add Player
            </button>
          </div>

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
    </main>
  );
}
