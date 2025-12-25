/**
 * Event Emitter for Server-Sent Events (SSE)
 * Manages active SSE connections per game code
 */

type SSEConnection = {
  response: Response;
  controller: ReadableStreamDefaultController;
};

class GameEventEmitter {
  private connections: Map<string, Set<SSEConnection>> = new Map();

  /**
   * Subscribe a new SSE connection for a game code
   */
  subscribe(gameCode: string, connection: SSEConnection): void {
    if (!this.connections.has(gameCode)) {
      this.connections.set(gameCode, new Set());
    }
    this.connections.get(gameCode)!.add(connection);
  }

  /**
   * Unsubscribe an SSE connection from a game code
   */
  unsubscribe(gameCode: string, connection: SSEConnection): void {
    const gameConnections = this.connections.get(gameCode);
    if (gameConnections) {
      gameConnections.delete(connection);
      // Clean up empty sets
      if (gameConnections.size === 0) {
        this.connections.delete(gameCode);
      }
    }
  }

  /**
   * Broadcast an event to all connections for a specific game code
   */
  broadcast(gameCode: string, eventType: string, data: unknown): void {
    const gameConnections = this.connections.get(gameCode);
    if (!gameConnections || gameConnections.size === 0) {
      return;
    }

    const eventData = JSON.stringify(data);
    const message = `event: ${eventType}\ndata: ${eventData}\n\n`;

    // Send to all connections, removing dead ones
    const deadConnections: SSEConnection[] = [];

    for (const connection of gameConnections) {
      try {
        connection.controller.enqueue(new TextEncoder().encode(message));
      } catch (error) {
        // Connection is dead, mark for removal
        deadConnections.push(connection);
      }
    }

    // Clean up dead connections
    for (const deadConnection of deadConnections) {
      this.unsubscribe(gameCode, deadConnection);
    }
  }

  /**
   * Get the number of active connections for a game code
   */
  getConnectionCount(gameCode: string): number {
    return this.connections.get(gameCode)?.size ?? 0;
  }

  /**
   * Get all game codes with active connections
   */
  getActiveGames(): string[] {
    return Array.from(this.connections.keys());
  }
}

// Export singleton instance
// Use globalThis to ensure we use the same instance across different module contexts
// This is important in SolidStart where "use server" files might be in different bundles
declare global {
  var __gameEventEmitter: GameEventEmitter | undefined;
}

export const gameEventEmitter =
  globalThis.__gameEventEmitter ??
  (globalThis.__gameEventEmitter = new GameEventEmitter());
