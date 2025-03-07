/**
 * Core type definitions for the state management system
 */

export type Action = {
  type: string;
  payload?: any;
  meta?: Record<string, any>;
};

export type AsyncAction<T> = (
  dispatch: (action: Action | AsyncAction<T>) => void,
  getState: () => T
) => void | Promise<any>;

export type Reducer<S> = (state: S, action: Action) => S;
export type Listener<T> = (state: T) => void;
export type Selector<T, R> = (state: T) => R;
export type Unsubscribe = () => void;
export type Middleware<T> = (
  store: StoreAPI<T>
) => (next: (action: Action) => void) => (action: Action) => void;

/**
 * Public API interface for the store
 */
export interface StoreAPI<T> {
  getState(): Readonly<T>;
  dispatch(action: Action | AsyncAction<T>): void;
  subscribe(listener: Listener<T>): Unsubscribe;
  select<R>(selector: Selector<T, R>, onChange: Listener<R>): Unsubscribe;
}

/**
 * Cancelable async action interface
 */
export interface CancelableAsyncAction<T> extends AsyncAction<T> {
  cancel: () => void;
}

/**
 * Internal state of a cancelable operation
 */
export interface CancelationState {
  isCanceled: boolean;
  isActive: boolean;
}
