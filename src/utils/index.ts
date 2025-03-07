import {
  Action,
  Reducer,
  AsyncAction,
  CancelableAsyncAction,
  CancelationState,
} from "../core/types";

/**
 * Create a typed action creator
 */
export function createAction<P = void, M = void>(type: string) {
  return (payload?: P, meta?: M): Action => ({
    type,
    ...(payload !== undefined ? { payload } : {}),
    ...(meta !== undefined ? { meta: meta as any } : {}),
  });
}

/**
 * Create a debounced action with metadata
 */
export function createDebouncedAction<P = void>(
  type: string,
  wait: number = 100
) {
  return (payload?: P): Action => ({
    type,
    ...(payload !== undefined ? { payload } : {}),
    meta: { debounce: wait },
  });
}

/**
 * Create a cancelable async action
 */
export function createCancelableAction<T, P = void>(
  requestId: string,
  actionCreator: (payload: P) => AsyncAction<T>
): (payload: P) => CancelableAsyncAction<T> {
  return (payload: P) => {
    // Define a properly typed asyncAction function
    const asyncAction = function (
      dispatch: (action: Action | AsyncAction<T>) => void,
      getState: () => T
    ) {
      // Get cancellation state from store
      const store = getState() as unknown as {
        trackRequest?: (id: string) => CancelationState;
        completeRequest?: (id: string) => void;
      };

      if (!store.trackRequest || !store.completeRequest) {
        console.error(
          "Store must implement trackRequest and completeRequest methods"
        );
        return actionCreator(payload)(dispatch, getState);
      }

      const cancelState = store.trackRequest(requestId);

      try {
        // Run original action
        const result = actionCreator(payload)(dispatch, getState);

        // Handle both Promise and non-Promise returns
        if (result instanceof Promise) {
          return result
            .then((value) => {
              // Complete the request if not canceled
              if (!cancelState.isCanceled) {
                if (store.completeRequest) {
                  store.completeRequest(requestId);
                }
              }
              return value;
            })
            .catch((error) => {
              // Always complete request on error
              if (store.completeRequest) {
                store.completeRequest(requestId);
              }
              throw error;
            });
        } else {
          // For synchronous actions
          if (!cancelState.isCanceled) {
            store.completeRequest(requestId);
          }
          return result;
        }
      } catch (error) {
        // Always complete request on error
        store.completeRequest(requestId);
        throw error;
      }
    } as CancelableAsyncAction<T>;

    // Add cancel method
    asyncAction.cancel = function () {
      // Need a reference to dispatch, which will be provided when the action is executed
      // This is a limitation of this implementation and may require a different approach
      if (typeof window !== "undefined") {
        console.warn("Cancel method called before action dispatched");
      }
      // In a real implementation, we would need to store a reference to dispatch
      // or use a global dispatch function
    };

    return asyncAction;
  };
}

/**
 * Combine multiple reducers into one
 */
export function combineReducers<T extends Record<string, any>>(reducers: {
  [K in keyof T]: Reducer<T[K]>;
}): Reducer<T> {
  return (state: T = {} as T, action: Action) => {
    const nextState: Partial<T> = {};
    let hasChanged = false;

    for (const key in reducers) {
      if (Object.prototype.hasOwnProperty.call(reducers, key)) {
        const reducer = reducers[key];
        const previousStateForKey = state[key];
        const nextStateForKey = reducer(previousStateForKey, action);

        nextState[key] = nextStateForKey;
        hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
      }
    }

    return hasChanged ? (nextState as T) : state;
  };
}

/**
 * Create a reducer from a map of action handlers
 */
export function createReducer<S>(
  initialState: S,
  handlers: Record<string, (state: S, action: Action) => S>
): Reducer<S> {
  return (state: S = initialState, action: Action): S => {
    if (Object.prototype.hasOwnProperty.call(handlers, action.type)) {
      return handlers[action.type](state, action);
    }
    return state;
  };
}
