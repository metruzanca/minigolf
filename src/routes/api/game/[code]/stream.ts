import type { APIEvent } from "@solidjs/start/server";
import type { RouteDefinition } from "@solidjs/router";
import { gameEventEmitter } from "~/api/eventEmitter";
import { getGame } from "~/api/server";

/**
 * SSE endpoint for real-time game updates
 * Route: /api/game/[code]/stream
 */
export const route = {
  // Ensure this route is treated as an API route
} satisfies RouteDefinition;

export async function GET(event: APIEvent) {
  const request = event.request;
  
  // Extract game code from URL path
  // Path should be /api/game/[code]/stream
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  
  // Find the game code (should be after "game" in the path)
  let gameCode: string | undefined;
  const gameIndex = pathParts.indexOf("game");
  if (gameIndex !== -1 && pathParts[gameIndex + 1]) {
    gameCode = pathParts[gameIndex + 1];
  }
  
  // Fallback: try params if available
  if (!gameCode) {
    const params = event.params || (event as any).context?.params;
    gameCode = params?.code;
  }
  
  if (!gameCode) {
    return new Response("Game code is required", { 
      status: 400,
      headers: { "Content-Type": "text/plain" }
    });
  }

  // Validate that the game exists
  try {
    await getGame(gameCode);
  } catch (error) {
    return new Response("Game not found", { 
      status: 404,
      headers: { "Content-Type": "text/plain" }
    });
  }

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const connection = {
        response: new Response(),
        controller,
      };

      // Register this connection
      gameEventEmitter.subscribe(gameCode, connection);

      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(`event: connected\ndata: {"status":"connected"}\n\n`)
      );

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`event: heartbeat\ndata: {"time":"${new Date().toISOString()}"}\n\n`)
          );
        } catch (error) {
          // Connection is dead, stop heartbeat
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        gameEventEmitter.unsubscribe(gameCode, connection);
        try {
          controller.close();
        } catch (error) {
          // Connection already closed
        }
      });
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable buffering in nginx
    },
  });
}

