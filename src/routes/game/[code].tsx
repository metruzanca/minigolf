import { createSignal, createEffect, For, Show } from "solid-js";
import {
  useParams,
  useSearchParams,
  useNavigate,
  useAction,
} from "@solidjs/router";
import { createAsync } from "@solidjs/router";
import {
  getGame,
  addScore,
  updateCurrentHole,
  addPlayer,
  getAverageScoreForHole,
} from "~/api";
import type { RouteDefinition } from "@solidjs/router";

export const route = {
  load({ params }) {
    if (params.code) {
      getGame(params.code);
    }
  },
} satisfies RouteDefinition;

type Player = {
  id: number;
  name: string;
  ballColor: string;
};

type Score = {
  id: number;
  playerId: number;
  holeNumber: number;
  score: number;
};

type GameData = {
  id: number;
  shortCode: string;
  numHoles: number;
  currentHole: number;
  players: Player[];
  scores: Score[];
};

export default function Game() {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const addScoreAction = useAction(addScore);
  const updateCurrentHoleAction = useAction(updateCurrentHole);
  const addPlayerAction = useAction(addPlayer);

  // Force refresh signal to trigger query revalidation
  const [refreshKey, setRefreshKey] = createSignal(0);

  const gameData = createAsync(() => {
    if (!params.code) {
      throw new Error("Game code is required");
    }
    // Include refreshKey to force re-fetch when scores change
    refreshKey();
    return getGame(params.code);
  });
  const [viewingHole, setViewingHole] = createSignal<number>(1);
  const [showAddPlayerModal, setShowAddPlayerModal] = createSignal(false);
  const [newPlayerName, setNewPlayerName] = createSignal("");
  const [newPlayerColor, setNewPlayerColor] = createSignal("#FF0000");
  const [isAddingPlayer, setIsAddingPlayer] = createSignal(false);
  const [maxScore, setMaxScore] = createSignal<number>(0);
  const [completedPlayersCollapsed, setCompletedPlayersCollapsed] =
    createSignal(true);
  const [showMenu, setShowMenu] = createSignal(false);
  const [editingScore, setEditingScore] = createSignal<{
    playerId: number;
    playerName: string;
    playerColor: string;
    currentScore: number;
    holeNumber: number;
  } | null>(null);

  // Initialize viewing hole from URL or current hole
  createEffect(() => {
    const game = gameData();
    if (game) {
      const holeParam = Array.isArray(searchParams.hole)
        ? searchParams.hole[0]
        : searchParams.hole;
      const holeFromUrl = holeParam ? parseInt(holeParam) : null;
      setViewingHole(holeFromUrl || game.currentHole);
    }
  });

  // Update max score when scores change
  createEffect(() => {
    const game = gameData();
    if (!game) return;

    const currentHoleScores = game.scores.filter(
      (s) => s.holeNumber === viewingHole()
    );
    if (currentHoleScores.length > 0) {
      const max = Math.max(...currentHoleScores.map((s) => s.score));
      setMaxScore(max);
    } else {
      setMaxScore(0);
    }
  });

  const [isAutoAdvancing, setIsAutoAdvancing] = createSignal(false);

  const handleScore = async (
    playerId: number,
    score: number,
    closeModal = false
  ) => {
    const game = gameData();
    if (!game) return;

    const hole = viewingHole();
    await addScoreAction(playerId, game.id, hole, score);

    // Force query refresh by updating the refresh key
    setRefreshKey((prev) => prev + 1);

    if (closeModal) {
      setEditingScore(null);
    }

    // Actions automatically revalidate queries, so gameData will update
    // Check for auto-advance after a brief delay to allow data to refresh
    if (hole === game.currentHole && !isAutoAdvancing()) {
      setTimeout(() => {
        const updatedGame = gameData();
        if (!updatedGame) return;

        const players = updatedGame.players;
        const scores = updatedGame.scores.filter((s) => s.holeNumber === hole);

        // Check if all players have scores for this hole
        if (scores.length === players.length && hole < updatedGame.numHoles) {
          setIsAutoAdvancing(true);
          // Auto-advance to next hole
          const nextHole = hole + 1;
          updateCurrentHoleAction(updatedGame.id, nextHole).then(() => {
            // Action will automatically revalidate, so gameData will update
            setViewingHole(nextHole);
            setSearchParams({ hole: nextHole.toString() });
            setIsAutoAdvancing(false);
          });
        }
      }, 200);
    }
  };

  const handleAddPlayer = async () => {
    const game = gameData();
    if (!game || !newPlayerName().trim()) return;

    setIsAddingPlayer(true);
    try {
      const player = await addPlayerAction(
        game.id,
        newPlayerName().trim(),
        newPlayerColor()
      );

      // Calculate average scores for all completed holes
      for (let hole = 1; hole < game.currentHole; hole++) {
        const avgScore = await getAverageScoreForHole(game.id, hole);
        if (avgScore > 0) {
          await addScoreAction(player.id, game.id, hole, avgScore);
        }
      }

      setShowAddPlayerModal(false);
      setNewPlayerName("");
      setNewPlayerColor("#FF0000");
      // Actions automatically revalidate queries, so gameData will update
    } catch (error) {
      console.error("Failed to add player:", error);
      alert("Failed to add player. Please try again.");
    } finally {
      setIsAddingPlayer(false);
    }
  };

  const navigateToHole = (hole: number) => {
    setViewingHole(hole);
    setSearchParams({ hole: hole.toString() });
  };

  const game = () => gameData() as GameData | undefined;
  const currentHole = () => game()?.currentHole || 1;
  const viewingHoleNum = () => viewingHole();

  // Get players with their scores for current viewing hole
  const getPlayersWithScores = () => {
    const g = game();
    if (!g) return { active: [], completed: [] };

    const active: Array<{ player: Player; score?: Score }> = [];
    const completed: Array<{ player: Player; score: Score }> = [];

    g.players.forEach((player) => {
      const score = g.scores.find(
        (s) => s.playerId === player.id && s.holeNumber === viewingHoleNum()
      );
      if (score) {
        completed.push({ player, score });
      } else {
        active.push({ player });
      }
    });

    return { active, completed };
  };

  // Calculate total score for a player
  const getTotalScore = (playerId: number) => {
    const g = game();
    if (!g) return 0;
    return g.scores
      .filter((s) => s.playerId === playerId && s.holeNumber < currentHole())
      .reduce((sum, s) => sum + s.score, 0);
  };

  // Get sorted players for scoreboard
  const getScoreboardPlayers = () => {
    const g = game();
    if (!g) return [];

    return g.players
      .map((player) => ({
        player,
        totalScore: getTotalScore(player.id),
        holesPlayed: g.scores.filter(
          (s) => s.playerId === player.id && s.holeNumber < currentHole()
        ).length,
      }))
      .sort((a, b) => {
        if (a.totalScore !== b.totalScore) {
          return a.totalScore - b.totalScore;
        }
        // Tie-breaker: fewer holes played is better
        return a.holesPlayed - b.holesPlayed;
      });
  };

  return (
    <main class="min-h-screen bg-gray-50">
      <Show
        when={game()}
        fallback={
          <div class="min-h-screen flex items-center justify-center p-4">
            <div class="text-center">
              <h1 class="text-2xl font-bold text-gray-900 mb-4">
                Game Not Found
              </h1>
              <p class="text-gray-600 mb-6">
                The game you're looking for doesn't exist.
              </p>
              <a
                href="/"
                class="inline-block min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Go Home
              </a>
            </div>
          </div>
        }
      >
        {(g) => (
          <>
            {/* Header with game code */}
            <div class="bg-blue-600 text-white p-3 sticky top-0 z-20">
              <div class="max-w-2xl mx-auto flex items-center justify-between">
                <a href="/" class="text-white hover:text-blue-200 font-medium">
                  ← Home
                </a>
                <div class="text-sm">
                  Game: <span class="font-mono font-bold">{g().shortCode}</span>
                </div>
                <div class="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(!showMenu());
                    }}
                    class="min-h-[44px] min-w-[44px] flex items-center justify-center text-white hover:text-blue-200 transition-colors"
                    aria-label="Menu"
                  >
                    <svg
                      class="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                  </button>
                  <Show when={showMenu()}>
                    <div
                      class="fixed inset-0 z-20"
                      onClick={() => setShowMenu(false)}
                    >
                      <div
                        class="absolute right-4 top-16 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-30"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setShowAddPlayerModal(true);
                            setShowMenu(false);
                          }}
                          class="w-full text-left px-4 py-2 text-gray-900 hover:bg-gray-100 transition-colors"
                        >
                          Add Player
                        </button>
                      </div>
                    </div>
                  </Show>
                </div>
              </div>
            </div>

            {/* Scoreboard */}
            <div class="bg-white border-b border-gray-200 p-4 sticky top-[60px] z-10">
              <div class="max-w-2xl mx-auto">
                <h1 class="text-xl font-bold text-gray-900 mb-3">Scoreboard</h1>
                <div class="overflow-x-auto -mx-4 px-4">
                  <div class="flex gap-3 min-w-max pb-2">
                    <For each={getScoreboardPlayers()}>
                      {(item, index) => (
                        <div
                          class="flex flex-col items-center justify-center p-4 rounded-lg min-w-[100px] shadow-sm border-2"
                          style={{
                            "background-color": item.player.ballColor,
                            "border-color": item.player.ballColor,
                            opacity: 0.9,
                          }}
                        >
                          <span class="text-3xl font-bold text-white mb-2 drop-shadow-md">
                            {item.totalScore}
                          </span>
                          <span class="text-sm font-medium text-white drop-shadow-md text-center">
                            {item.player.name}
                          </span>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Hole Display */}
            <div class="bg-white border-b border-gray-200 p-4">
              <div class="max-w-2xl mx-auto text-center">
                <h2 class="text-2xl font-bold text-gray-900">
                  Hole {viewingHoleNum()} of {g().numHoles}
                </h2>
              </div>
            </div>

            {/* Navigation */}
            <div class="bg-white border-b border-gray-200 p-4">
              <div class="max-w-2xl mx-auto flex items-center justify-center gap-4">
                <button
                  onClick={() => navigateToHole(viewingHoleNum() - 1)}
                  disabled={viewingHoleNum() === 1}
                  class="min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 hover:text-gray-900"
                >
                  ←
                </button>
                <button
                  onClick={() => navigateToHole(currentHole())}
                  disabled={viewingHoleNum() === currentHole()}
                  class="min-h-[44px] px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed bg-gray-200 hover:bg-gray-300 rounded-lg font-medium text-gray-900"
                >
                  Current
                </button>
                <button
                  onClick={() => navigateToHole(viewingHoleNum() + 1)}
                  disabled={viewingHoleNum() >= currentHole()}
                  class="min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 hover:text-gray-900"
                >
                  →
                </button>
              </div>
            </div>

            {/* Player Cards */}
            <div class="max-w-2xl mx-auto p-4 space-y-4">
              <For each={getPlayersWithScores().active}>
                {({ player }) => (
                  <div class="bg-white border border-gray-200 rounded-lg p-4">
                    <div class="flex items-center gap-3 mb-4">
                      <div
                        class="w-8 h-8 rounded-full border-2 border-gray-300"
                        style={{ "background-color": player.ballColor }}
                      ></div>
                      <h3 class="text-lg font-semibold text-gray-900">
                        {player.name}
                      </h3>
                    </div>
                    <div class="grid grid-cols-3 gap-2">
                      {[1, 2, 3, 4, 5, 6].map((score) => {
                        const shouldDim = maxScore() > 0 && score < maxScore();
                        return (
                          <button
                            onClick={() => handleScore(player.id, score)}
                            class={`min-h-[44px] py-2 px-4 rounded-lg font-semibold transition-all ${
                              shouldDim
                                ? "opacity-40 bg-gray-100 text-gray-600 hover:opacity-60"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                            }`}
                          >
                            {score}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </For>

              {/* Completed Players */}
              <Show when={getPlayersWithScores().completed.length > 0}>
                <div class="bg-white border border-gray-200 rounded-lg">
                  <button
                    onClick={() =>
                      setCompletedPlayersCollapsed(!completedPlayersCollapsed())
                    }
                    class="w-full p-4 flex items-center justify-between"
                  >
                    <span class="font-semibold text-gray-900">
                      Completed ({getPlayersWithScores().completed.length})
                    </span>
                    <span class="text-gray-500">
                      {completedPlayersCollapsed() ? "▼" : "▲"}
                    </span>
                  </button>
                  <Show when={!completedPlayersCollapsed()}>
                    <div class="p-4 pt-0 space-y-3">
                      <For each={getPlayersWithScores().completed}>
                        {({ player, score }) => (
                          <button
                            onClick={() =>
                              setEditingScore({
                                playerId: player.id,
                                playerName: player.name,
                                playerColor: player.ballColor,
                                currentScore: score.score,
                                holeNumber: viewingHole(),
                              })
                            }
                            class="w-full flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                          >
                            <div class="flex items-center gap-3">
                              <div
                                class="w-6 h-6 rounded-full border border-gray-300"
                                style={{ "background-color": player.ballColor }}
                              ></div>
                              <span class="font-medium text-gray-900">
                                {player.name}
                              </span>
                            </div>
                            <span class="font-semibold text-gray-900">
                              {score.score}
                            </span>
                          </button>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              </Show>
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
                      class="flex-1 min-h-[44px] bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddPlayer}
                      disabled={!newPlayerName().trim() || isAddingPlayer()}
                      class="flex-1 min-h-[44px] bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      {isAddingPlayer() ? "Adding..." : "Add"}
                    </button>
                  </div>
                </div>
              </div>
            </Show>

            {/* Edit Score Modal */}
            <Show when={editingScore()}>
              {(editing) => (
                <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                  <div class="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
                    <h3 class="text-xl font-bold text-gray-900">
                      Edit Score - {editing().playerName}
                    </h3>
                    <div class="flex items-center gap-3 mb-4">
                      <div
                        class="w-8 h-8 rounded-full border-2 border-gray-300"
                        style={{ "background-color": editing().playerColor }}
                      ></div>
                      <div>
                        <p class="text-sm text-gray-600">Current Score</p>
                        <p class="text-lg font-semibold text-gray-900">
                          {editing().currentScore}
                        </p>
                      </div>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-3">
                        Select New Score
                      </label>
                      <div class="grid grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6].map((score) => (
                          <button
                            onClick={() =>
                              handleScore(editing().playerId, score, true)
                            }
                            class="min-h-[44px] py-2 px-4 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div class="flex gap-3">
                      <button
                        onClick={() => setEditingScore(null)}
                        class="flex-1 min-h-[44px] bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 px-4 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </Show>
          </>
        )}
      </Show>
    </main>
  );
}
