import { createSignal, createEffect, For, Show, onMount } from "solid-js";
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
  addHole,
} from "~/api";
import type { RouteDefinition } from "@solidjs/router";
import { addGameCode } from "~/utils/gameStorage";
import { HomeIcon } from "~/components/icons";
import { Motion, Presence } from "solid-motionone";

// Maximum number of shots allowed (should match server-side MAX_SHOTS env var, default 10)
const MAX_SHOTS = 10;

// Generate array of valid score values [1, 2, 3, ..., MAX_SHOTS]
const getScoreOptions = () =>
  Array.from({ length: MAX_SHOTS }, (_, i) => i + 1);

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
  createdAt: Date | string;
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
  const addHoleAction = useAction(addHole);

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
  const [previousHole, setPreviousHole] = createSignal<number | null>(null);
  const [showAddPlayerModal, setShowAddPlayerModal] = createSignal(false);
  const [newPlayerName, setNewPlayerName] = createSignal("");
  const [newPlayerColor, setNewPlayerColor] = createSignal("#FF0000");
  const [isAddingPlayer, setIsAddingPlayer] = createSignal(false);
  const [maxScore, setMaxScore] = createSignal<number>(0);
  const [completedPlayersCollapsed, setCompletedPlayersCollapsed] =
    createSignal(true);
  const [showMenu, setShowMenu] = createSignal(false);
  const [showSummaryModal, setShowSummaryModal] = createSignal(false);
  const [editingScore, setEditingScore] = createSignal<{
    playerId: number;
    playerName: string;
    playerColor: string;
    currentScore: number;
    holeNumber: number;
  } | null>(null);

  // Add game code to localStorage when page is visited, with timestamp from game data
  createEffect(() => {
    const game = gameData();
    if (game && params.code) {
      addGameCode(params.code, game.createdAt);
    }
  });

  // Initialize viewing hole from URL or current hole
  createEffect(() => {
    const game = gameData();
    if (game) {
      const holeParam = Array.isArray(searchParams.hole)
        ? searchParams.hole[0]
        : searchParams.hole;

      let newHole = game.currentHole;
      if (holeParam) {
        const parsed = parseInt(holeParam, 10);
        // Validate: must be a valid number, positive integer, and within game bounds
        if (
          !isNaN(parsed) &&
          Number.isInteger(parsed) &&
          parsed > 0 &&
          parsed <= game.numHoles
        ) {
          newHole = parsed;
        }
      }

      const currentHole = viewingHole();
      if (currentHole !== newHole && currentHole !== 0) {
        setPreviousHole(currentHole);
      }
      // Initialize previousHole to match viewingHole on first load
      if (previousHole() === null) {
        setPreviousHole(newHole);
      }
      setViewingHole(newHole);
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

  // Auto-open completed players section when viewing previous holes
  createEffect(() => {
    const game = gameData();
    if (!game) return;
    const viewing = viewingHole();
    const current = currentHole();
    if (viewing < current) {
      setCompletedPlayersCollapsed(false);
    }
  });

  const handleScore = async (
    playerId: number,
    score: number,
    closeModal = false
  ) => {
    const game = gameData();
    if (!game) return;

    const hole = viewingHole();
    try {
      await addScoreAction(playerId, game.id, hole, score);

      // Force query refresh by updating the refresh key
      setRefreshKey((prev) => prev + 1);

      if (closeModal) {
        setEditingScore(null);
      }
    } catch (error) {
      console.error("Failed to add score:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to add score";
      alert(errorMessage);
    }
  };

  const handleAddHole = async () => {
    const game = gameData();
    if (!game) return;

    try {
      await addHoleAction(game.id);
      setRefreshKey((prev) => prev + 1);

      // Navigate to the new hole after a brief delay to allow data to refresh
      setTimeout(() => {
        const updatedGame = gameData();
        if (updatedGame) {
          setViewingHole(updatedGame.currentHole);
          setSearchParams({ hole: updatedGame.currentHole.toString() });
        }
      }, 200);
    } catch (error) {
      console.error("Failed to add hole:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to add hole";
      alert(errorMessage);
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
    setPreviousHole(viewingHole());
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

  // Check if all players have completed the current hole
  const allPlayersCompletedCurrentHole = () => {
    const g = game();
    if (!g) return false;
    const playersWithScores = getPlayersWithScores();
    return (
      viewingHoleNum() === currentHole() &&
      playersWithScores.active.length === 0 &&
      playersWithScores.completed.length === g.players.length &&
      g.players.length > 0
    );
  };

  // Calculate total score for a player
  const getTotalScore = (playerId: number) => {
    const g = game();
    if (!g) return 0;
    const maxHoleToInclude = allPlayersCompletedCurrentHole()
      ? currentHole()
      : currentHole() - 1;
    return g.scores
      .filter(
        (s) => s.playerId === playerId && s.holeNumber <= maxHoleToInclude
      )
      .reduce((sum, s) => sum + s.score, 0);
  };

  // Get sorted players for scoreboard
  const getScoreboardPlayers = () => {
    const g = game();
    if (!g) return [];
    const maxHoleToInclude = allPlayersCompletedCurrentHole()
      ? currentHole()
      : currentHole() - 1;

    return g.players
      .map((player) => ({
        player,
        totalScore: getTotalScore(player.id),
        holesPlayed: g.scores.filter(
          (s) => s.playerId === player.id && s.holeNumber <= maxHoleToInclude
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

  // Get score for a specific player and hole
  const getScoreForHole = (playerId: number, holeNumber: number) => {
    const g = game();
    if (!g) return null;
    const score = g.scores.find(
      (s) => s.playerId === playerId && s.holeNumber === holeNumber
    );
    return score ? score.score : null;
  };

  // Get average score for a player
  const getAverageScore = (playerId: number) => {
    const g = game();
    if (!g) return 0;
    const playerScores = g.scores.filter(
      (s) => s.playerId === playerId && s.holeNumber < currentHole()
    );
    if (playerScores.length === 0) return 0;
    const total = playerScores.reduce((sum, s) => sum + s.score, 0);
    return Math.round((total / playerScores.length) * 10) / 10;
  };

  // Summary-specific functions that include the viewing hole
  const getSummaryTotalScore = (playerId: number) => {
    const g = game();
    if (!g) return 0;
    return g.scores
      .filter(
        (s) => s.playerId === playerId && s.holeNumber <= viewingHoleNum()
      )
      .reduce((sum, s) => sum + s.score, 0);
  };

  const getSummaryAverageScore = (playerId: number) => {
    const g = game();
    if (!g) return 0;
    const playerScores = g.scores.filter(
      (s) => s.playerId === playerId && s.holeNumber <= viewingHoleNum()
    );
    if (playerScores.length === 0) return 0;
    const total = playerScores.reduce((sum, s) => sum + s.score, 0);
    return Math.round((total / playerScores.length) * 10) / 10;
  };

  const getSummaryPlayers = () => {
    const g = game();
    if (!g) return [];

    return g.players
      .map((player) => ({
        player,
        totalScore: getSummaryTotalScore(player.id),
        holesPlayed: g.scores.filter(
          (s) => s.playerId === player.id && s.holeNumber <= viewingHoleNum()
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
                <a
                  href="/"
                  class="text-white hover:text-blue-200 font-medium min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Home"
                >
                  <HomeIcon />
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
                <div class="flex items-center justify-center gap-4 mb-3">
                  <button
                    onClick={() => navigateToHole(viewingHoleNum() - 1)}
                    disabled={viewingHoleNum() === 1}
                    class="min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 hover:text-gray-900"
                  >
                    ←
                  </button>
                  <h1 class="text-xl font-bold text-gray-900">
                    Hole {viewingHoleNum()}
                  </h1>
                  <button
                    onClick={() => navigateToHole(viewingHoleNum() + 1)}
                    disabled={viewingHoleNum() >= currentHole()}
                    class="min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 hover:text-gray-900"
                  >
                    →
                  </button>
                </div>
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

            {/* Player Cards */}
            <div class="max-w-2xl mx-auto p-4 space-y-4">
              <Presence exitBeforeEnter>
                <Show when={viewingHoleNum()} keyed>
                  {(holeNum) => {
                    const prevHole = previousHole();
                    // If previousHole is null, default to no direction (first load)
                    const isGoingForward =
                      prevHole !== null ? holeNum > prevHole : false;
                    const slideDistance = 50;
                    // When going forward (next hole): old content exits left, new content comes from right
                    // When going backward (previous hole): old content exits right, new content comes from left
                    const initialX = isGoingForward
                      ? slideDistance
                      : -slideDistance;
                    // Exit is opposite of initial
                    const exitX = -initialX;
                    return (
                      <Motion.div
                        initial={{
                          opacity: 0,
                          x: initialX,
                        }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{
                          opacity: 0,
                          x: exitX,
                        }}
                        transition={{ duration: 0.3, easing: "ease-in-out" }}
                        class="space-y-4"
                      >
                        <For each={getPlayersWithScores().active}>
                          {({ player }) => (
                            <div class="bg-white border border-gray-200 rounded-lg p-4">
                              <div class="flex items-center gap-3 mb-4">
                                <div
                                  class="w-8 h-8 rounded-full border-2 border-gray-300"
                                  style={{
                                    "background-color": player.ballColor,
                                  }}
                                ></div>
                                <h3 class="text-lg font-semibold text-gray-900">
                                  {player.name}
                                </h3>
                              </div>
                              <div class="grid grid-cols-5 gap-1.5">
                                {getScoreOptions().map((score) => {
                                  const shouldDim =
                                    maxScore() > 0 && score < maxScore();
                                  return (
                                    <button
                                      onClick={() =>
                                        handleScore(player.id, score)
                                      }
                                      class={`min-h-[36px] py-1.5 px-2 rounded-md text-sm font-semibold transition-all ${
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
                        <Show
                          when={getPlayersWithScores().completed.length > 0}
                        >
                          <div class="bg-white border border-gray-200 rounded-lg">
                            <button
                              onClick={() =>
                                setCompletedPlayersCollapsed(
                                  !completedPlayersCollapsed()
                                )
                              }
                              class="w-full p-4 flex items-center justify-between"
                            >
                              <span class="font-semibold text-gray-900">
                                Completed (
                                {getPlayersWithScores().completed.length})
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
                                          style={{
                                            "background-color":
                                              player.ballColor,
                                          }}
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

                        {/* Add Hole / Summary Card - Show when all players have scores and viewing current hole */}
                        <Show
                          when={
                            viewingHoleNum() === currentHole() &&
                            getPlayersWithScores().active.length === 0 &&
                            getPlayersWithScores().completed.length ===
                              g().players.length &&
                            g().players.length > 0
                          }
                        >
                          <div class="bg-white border-2 border-blue-500 rounded-lg p-6 space-y-4">
                            <h3 class="text-lg font-semibold text-gray-900 text-center">
                              All players have completed this hole
                            </h3>
                            <div class="flex gap-3">
                              <button
                                onClick={handleAddHole}
                                class="flex-1 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                              >
                                Add Hole
                              </button>
                              <button
                                onClick={() => setShowSummaryModal(true)}
                                class="flex-1 min-h-[44px] bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                              >
                                Summary
                              </button>
                            </div>
                          </div>
                        </Show>
                      </Motion.div>
                    );
                  }}
                </Show>
              </Presence>
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
                      <div class="grid grid-cols-5 gap-1.5">
                        {getScoreOptions().map((score) => (
                          <button
                            onClick={() =>
                              handleScore(editing().playerId, score, true)
                            }
                            class="min-h-[36px] py-1.5 px-2 rounded-md text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
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

            {/* Summary Modal */}
            <Show when={showSummaryModal()}>
              <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                <div class="bg-white rounded-lg p-6 max-w-4xl w-full my-8 space-y-6">
                  <div class="flex items-center justify-between">
                    <h3 class="text-2xl font-bold text-gray-900">
                      Game Summary
                    </h3>
                    <button
                      onClick={() => setShowSummaryModal(false)}
                      class="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                      aria-label="Close"
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Overall Standings */}
                  <div>
                    <h4 class="text-lg font-semibold text-gray-900 mb-3">
                      Overall Standings
                    </h4>
                    <div class="space-y-2">
                      <For each={getSummaryPlayers()}>
                        {(item, index) => (
                          <div
                            class="flex items-center gap-4 p-3 rounded-lg border-2"
                            style={{
                              "border-color": item.player.ballColor,
                              "background-color": `${item.player.ballColor}15`,
                            }}
                          >
                            <div
                              class="flex items-center justify-center w-8 h-8 rounded-full font-bold text-white text-sm"
                              style={{
                                "background-color": item.player.ballColor,
                              }}
                            >
                              {index() + 1}
                            </div>
                            <div
                              class="w-6 h-6 rounded-full border-2 border-gray-300"
                              style={{
                                "background-color": item.player.ballColor,
                              }}
                            ></div>
                            <div class="flex-1">
                              <p class="font-semibold text-gray-900">
                                {item.player.name}
                              </p>
                              <p class="text-sm text-gray-600">
                                {item.holesPlayed} hole
                                {item.holesPlayed !== 1 ? "s" : ""} • Avg:{" "}
                                {getSummaryAverageScore(item.player.id)}
                              </p>
                            </div>
                            <div class="text-right">
                              <p class="text-2xl font-bold text-gray-900">
                                {item.totalScore}
                              </p>
                              <p class="text-xs text-gray-500">Total</p>
                            </div>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>

                  {/* Per-Hole Breakdown */}
                  <div>
                    <h4 class="text-lg font-semibold text-gray-900 mb-3">
                      Per-Hole Breakdown
                    </h4>
                    <div class="overflow-x-auto">
                      <table class="w-full border-collapse">
                        <thead>
                          <tr class="bg-gray-100">
                            <th class="text-left p-2 font-semibold text-gray-900 sticky left-0 bg-gray-100 z-10">
                              Player
                            </th>
                            <For
                              each={Array.from(
                                { length: viewingHoleNum() },
                                (_, i) => i + 1
                              )}
                            >
                              {(holeNum) => (
                                <th class="text-center p-2 font-semibold text-gray-900 min-w-[50px]">
                                  H{holeNum}
                                </th>
                              )}
                            </For>
                            <th class="text-center p-2 font-semibold text-gray-900 bg-gray-100">
                              Total
                            </th>
                            <th class="text-center p-2 font-semibold text-gray-900 bg-gray-100">
                              Avg
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={getSummaryPlayers()}>
                            {(item) => (
                              <tr class="border-b border-gray-200 hover:bg-gray-50">
                                <td class="p-2 sticky left-0 bg-white z-10">
                                  <div class="flex items-center gap-2">
                                    <div
                                      class="w-4 h-4 rounded-full border border-gray-300"
                                      style={{
                                        "background-color":
                                          item.player.ballColor,
                                      }}
                                    ></div>
                                    <span class="font-medium text-gray-900">
                                      {item.player.name}
                                    </span>
                                  </div>
                                </td>
                                <For
                                  each={Array.from(
                                    { length: viewingHoleNum() },
                                    (_, i) => i + 1
                                  )}
                                >
                                  {(holeNum) => {
                                    const score = getScoreForHole(
                                      item.player.id,
                                      holeNum
                                    );
                                    return (
                                      <td class="text-center p-2">
                                        {score !== null ? (
                                          <span class="font-semibold text-gray-900">
                                            {score}
                                          </span>
                                        ) : (
                                          <span class="text-gray-400">-</span>
                                        )}
                                      </td>
                                    );
                                  }}
                                </For>
                                <td class="text-center p-2 font-bold text-gray-900 bg-gray-50">
                                  {item.totalScore}
                                </td>
                                <td class="text-center p-2 font-semibold text-gray-700 bg-gray-50">
                                  {getSummaryAverageScore(item.player.id)}
                                </td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div class="flex justify-end">
                    <button
                      onClick={() => setShowSummaryModal(false)}
                      class="min-h-[44px] px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </Show>
          </>
        )}
      </Show>
    </main>
  );
}
