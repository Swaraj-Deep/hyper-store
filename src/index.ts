import { StateStore } from "./core/store";
import { Middleware } from "./core/types";
import {
  createThunkMiddleware,
  createCancelationMiddleware,
  createDebounceMiddleware,
} from "./middleware/index";

// Export core
export { StateStore } from "./core/store";
export type {
  Action,
  AsyncAction,
  Reducer,
  Listener,
  Selector,
  Unsubscribe,
  Middleware,
  StoreAPI,
  CancelableAsyncAction,
  CancelationState,
} from "./core/types";

// Export middleware
export {
  createLogger,
  createThunkMiddleware,
  createCancelationMiddleware,
  createDebounceMiddleware,
} from "./middleware/index";

// Export utilities
export {
  createAction,
  createDebouncedAction,
  createCancelableAction,
  combineReducers,
  createReducer,
} from "./utils/index";

/**
 * Create a new state store
 * @param initialState The initial state for the store
 * @param middlewares Optional array of middleware functions
 * @returns A configured StateStore instance
 */
export function createStore<T extends Record<string, any>>(
  initialState: T,
  middlewares: Middleware<T>[] = []
): StateStore<T> {
  return new StateStore<T>(initialState, middlewares);
}

/**
 * Setup default middleware with common functionality
 * @returns An array of configured middleware functions
 */
export function createDefaultMiddleware<
  T extends Record<string, any>
>(): Middleware<T>[] {
  return [
    createThunkMiddleware<T>(),
    createCancelationMiddleware<T>(),
    createDebounceMiddleware<T>(),
  ];
}
