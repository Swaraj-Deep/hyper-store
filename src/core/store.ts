import {
  Action,
  AsyncAction,
  Reducer,
  Listener,
  Selector,
  Unsubscribe,
  Middleware,
  StoreAPI,
  CancelationState,
} from "./types";

/**
 * Main state store implementation
 */
export class StateStore<T extends Record<string, any>> implements StoreAPI<T> {
  private state: T;
  private reducers: Map<string, Reducer<any>> = new Map();
  private listeners: Set<Listener<T>> = new Set();
  private selectorCache: Map<Selector<T, any>, any> = new Map();
  private selectorListeners: Map<Selector<T, any>, Set<Listener<any>>> =
    new Map();
  private batchedActions: Action[] = [];
  private batchTimeout: number | null = null;
  private middlewareChain: ((action: Action) => void) | null = null;
  private activeRequests: Map<string, CancelationState> = new Map();
  private readonly BATCH_DELAY = 4; // 4ms for high performance

  /**
   * Create a new state store
   */
  constructor(initialState: T, middlewares: Middleware<T>[] = []) {
    this.state = { ...initialState };
    this.setupMiddleware(middlewares);
  }

  /**
   * Get current state (immutable)
   */
  public getState(): Readonly<T> {
    return this.state;
  }

  /**
   * Register a reducer to handle a specific slice of state
   */
  public registerReducer<K extends keyof T>(
    key: K,
    reducer: Reducer<T[K]>
  ): void {
    this.reducers.set(key as string, reducer);
  }

  /**
   * Dispatch an action to update state
   * Supports both synchronous and asynchronous actions
   */
  public dispatch(action: Action | AsyncAction<T>): void {
    if (typeof action === "function") {
      (action as AsyncAction<T>)(
        this.dispatch.bind(this),
        this.getState.bind(this)
      );
      return;
    }

    // Add to batch queue
    this.batchedActions.push(action as Action);
    this.scheduleBatchProcessing();
  }

  /**
   * Subscribe to the entire state
   */
  public subscribe(listener: Listener<T>): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Subscribe to a specific slice of state via selector
   */
  public select<R>(
    selector: Selector<T, R>,
    onChange: Listener<R>
  ): Unsubscribe {
    // Initialize cache for this selector
    if (!this.selectorCache.has(selector)) {
      this.selectorCache.set(selector, selector(this.state));
    }

    // Get or create listener set
    if (!this.selectorListeners.has(selector)) {
      this.selectorListeners.set(selector, new Set());
    }

    // Add listener
    const listeners = this.selectorListeners.get(selector)!;
    listeners.add(onChange);

    // Initialize with current value
    onChange(this.selectorCache.get(selector) as R);

    // Return unsubscribe function
    return () => {
      const listeners = this.selectorListeners.get(selector);
      if (listeners) {
        listeners.delete(onChange);
        if (listeners.size === 0) {
          this.selectorListeners.delete(selector);
          this.selectorCache.delete(selector);
        }
      }
    };
  }

  /**
   * Force update state immediately (bypasses batching)
   */
  public forceUpdate(action: Action): void {
    if (this.middlewareChain) {
      this.middlewareChain(action);
    } else {
      this.processAction(action);
    }
  }

  /**
   * Track an async operation for cancellation support
   */
  public trackRequest(requestId: string): CancelationState {
    const state: CancelationState = {
      isCanceled: false,
      isActive: true,
    };

    this.activeRequests.set(requestId, state);
    return state;
  }

  /**
   * Cancel an active request
   */
  public cancelRequest(requestId: string): boolean {
    const request = this.activeRequests.get(requestId);
    if (request && request.isActive) {
      request.isCanceled = true;
      return true;
    }
    return false;
  }

  /**
   * Complete a request (cleanup)
   */
  public completeRequest(requestId: string): void {
    const request = this.activeRequests.get(requestId);
    if (request) {
      request.isActive = false;
      // Remove after short delay to allow pending handlers to check isCanceled
      setTimeout(() => {
        this.activeRequests.delete(requestId);
      }, 100);
    }
  }

  /**
   * Setup middleware chain
   */
  private setupMiddleware(middlewares: Middleware<T>[]): void {
    if (middlewares.length === 0) {
      this.middlewareChain = this.processAction.bind(this);
      return;
    }

    const chain = middlewares.map((middleware) => middleware(this));
    this.middlewareChain = chain.reduceRight(
      (next, middleware) => middleware(next),
      this.processAction.bind(this)
    );
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatchProcessing(): void {
    if (!this.batchTimeout) {
      // Use requestAnimationFrame in browser, setTimeout as fallback
      if (typeof requestAnimationFrame !== "undefined") {
        this.batchTimeout = requestAnimationFrame(() =>
          this.processBatch()
        ) as unknown as number;
      } else {
        this.batchTimeout = setTimeout(
          () => this.processBatch(),
          this.BATCH_DELAY
        ) as unknown as number;
      }
    }
  }

  /**
   * Process all batched actions
   */
  private processBatch(): void {
    this.batchTimeout = null;

    if (this.batchedActions.length === 0) {
      return;
    }

    const actionsToProcess = [...this.batchedActions];
    this.batchedActions = [];

    // Process all batched actions
    if (this.middlewareChain) {
      actionsToProcess.forEach((action) => this.middlewareChain!(action));
    }

    // Schedule next batch if more actions were added
    if (this.batchedActions.length > 0) {
      this.scheduleBatchProcessing();
    }
  }

  /**
   * Process a single action
   */
  private processAction(action: Action): void {
    const prevState = this.state;
    let hasChanged = false;
    const nextState = { ...prevState };

    // Apply reducers to their respective state slices
    for (const [key, reducer] of this.reducers.entries()) {
      const prevSlice = prevState[key];
      const nextSlice = reducer(prevSlice, action);

      if (prevSlice !== nextSlice) {
        (nextState as any)[key] = nextSlice;
        hasChanged = true;
      }
    }

    // Skip if no changes
    if (!hasChanged) return;

    // Update state and notify listeners
    this.state = nextState;
    this.updateSelectors();
    this.notifyListeners();
  }

  /**
   * Update selector caches and notify affected listeners
   */
  private updateSelectors(): void {
    for (const [selector, listeners] of this.selectorListeners.entries()) {
      const prevValue = this.selectorCache.get(selector);
      const nextValue = selector(this.state);

      // Skip if unchanged (shallow comparison)
      if (prevValue === nextValue) continue;

      // Update cache
      this.selectorCache.set(selector, nextValue);

      // Notify all listeners for this selector
      listeners.forEach((listener) => listener(nextValue));
    }
  }

  /**
   * Notify global state listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }
}
