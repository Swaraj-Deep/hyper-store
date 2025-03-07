import { Middleware, Action, StoreAPI } from "../core/types";

/**
 * Create a logger middleware
 */
export function createLogger<T>(): Middleware<T> {
  return (store: StoreAPI<T>) => (next) => (action: Action) => {
    console.group(`Action: ${action.type}`);
    console.log("Action:", action);
    const result = next(action);
    console.log("State after:", store.getState());
    console.groupEnd();
    return result;
  };
}

/**
 * Create a thunk middleware for handling async actions
 */
export function createThunkMiddleware<T>(): Middleware<T> {
  return (store: StoreAPI<T>) => (next) => (action: any) => {
    if (typeof action === "function") {
      return action(store.dispatch, store.getState);
    }
    return next(action);
  };
}

/**
 * Create a cancelation middleware for handling request cancellation
 */
export function createCancelationMiddleware<T>(): Middleware<T> {
  return (store: StoreAPI<T>) => (next) => (action: Action) => {
    // Handle action cancellation
    if (action.type === "@@cancelRequest" && action.payload?.requestId) {
      // Use type assertion here since we know the runtime implementation has this method
      const storeWithCancel = store as unknown as {
        cancelRequest(id: string): boolean;
      };
      return storeWithCancel.cancelRequest(action.payload.requestId);
    }
    return next(action);
  };
}

/**
 * Create a debounce middleware for handling high-frequency actions
 */
export function createDebounceMiddleware<T>(wait = 50): Middleware<T> {
  // Using ReturnType<typeof setTimeout> for compatibility
  const pending: Record<string, ReturnType<typeof setTimeout>> = {};

  return () => (next) => (action: Action) => {
    // Only debounce actions with meta.debounce property
    if (!action.meta?.debounce) {
      return next(action);
    }

    const key = action.type;
    const debounceTime =
      typeof action.meta.debounce === "number" ? action.meta.debounce : wait;

    // Clear previous timeout
    if (pending[key]) {
      clearTimeout(pending[key]);
    }

    // Schedule new timeout
    pending[key] = setTimeout(() => {
      delete pending[key];
      next(action);
    }, debounceTime);
  };
}
