import { Cron } from "croner";

/**
 * Initialize cron jobs for cleanup tasks
 * Runs daily at 2 AM to delete stale games (3+ days old)
 */
export function initializeCronJobs() {
  // Run daily at 2 AM
  const cleanupJob = new Cron(
    "0 2 * * *",
    {
      timezone: "UTC",
    },
    async () => {
      try {
        console.log("Running stale games cleanup job...");
        // Lazy import to avoid circular dependency
        const { deleteStaleGames } = await import("./server");
        const result = await deleteStaleGames();
        console.log(`Cleanup job completed: ${result.deleted} game(s) deleted`);
      } catch (error) {
        console.error("Error in cleanup cron job:", error);
      }
    }
  );

  console.log(
    "Cron jobs initialized: stale games cleanup scheduled for 2 AM UTC daily"
  );

  return {
    cleanupJob,
  };
}

// Auto-initialize when this module is imported (only in server context)
if (typeof window === "undefined") {
  initializeCronJobs();
}
