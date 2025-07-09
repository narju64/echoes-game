import * as Sentry from "@sentry/react";

// Set user context when a user logs in or joins a game
export const setUserContext = (userId: string, username: string) => {
  Sentry.setUser({
    id: userId,
    username: username,
  });
};

// Set game context for better error reporting
export const setGameContext = (gameMode: string, gameId?: string) => {
  Sentry.setContext("game", {
    mode: gameMode,
    id: gameId,
    timestamp: new Date().toISOString(),
  });
};

// Track game-specific errors with context
export const captureGameError = (error: Error, context: {
  gameMode?: string;
  gameId?: string;
  playerId?: string;
  action?: string;
  gameState?: any;
}) => {
  Sentry.withScope((scope) => {
    scope.setTag("error_type", "game_error");
    scope.setContext("game_context", context);
    scope.setLevel("error");
    Sentry.captureException(error);
  });
};

// Track performance of game operations
export const trackGamePerformance = (operation: string, duration: number, context?: any) => {
  Sentry.addBreadcrumb({
    category: "game_performance",
    message: `${operation} took ${duration}ms`,
    data: context,
    level: "info",
  });
};

// Clear context when leaving a game
export const clearGameContext = () => {
  Sentry.setContext("game", null);
}; 