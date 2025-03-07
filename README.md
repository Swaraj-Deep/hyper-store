# HyperStore: High-Performance State Management Library

HyperStore is a lightweight, high-performance state management library designed for modern JavaScript applications. It offers a predictable state container while providing a simple and intuitive API.

## Key Features

- **Batch Processing**: Intelligent batching of state updates for optimal rendering
- **Selector System**: Efficient state subscriptions with automatic memoization
- **Middleware Support**: Extensible architecture with powerful built-in middleware
- **Async Actions**: First-class support for asynchronous operations
- **Cancelable Requests**: Built-in request cancellation for race conditions
- **TypeScript Support**: Fully typed API for improved developer experience

## Installation

Since HyperStore is not yet published to npm, you can install it directly from the repository:

```bash
# Using npm
npm install git+https://github.com/yourusername/hyper-store.git

# Using yarn
yarn add git+https://github.com/yourusername/hyper-store.git
```

Alternatively, you can clone the repository and link it locally:

```bash
# Clone the repository
git clone https://github.com/yourusername/hyper-store.git
cd hyper-store

# Install dependencies
npm install

# Build the library
npm run build

# Link for local development
npm link

# In your project
npm link hyper-store
```

## Quick Start

```javascript
import { createStore, createDefaultMiddleware } from 'hyper-store';

// Create a store with initial state and default middleware
const store = createStore(
  { counter: 0, user: null },
  createDefaultMiddleware()
);

// Register reducers for different slices of state
store.registerReducer('counter', (state = 0, action) => {
  switch (action.type) {
    case 'INCREMENT':
      return state + 1;
    case 'DECREMENT':
      return state - 1;
    default:
      return state;
  }
});

// Subscribe to the entire state
store.subscribe(state => {
  console.log('State updated:', state);
});

// Subscribe to a specific slice using selectors
store.select(state => state.counter, count => {
  console.log('Counter updated:', count);
});

// Dispatch actions to update state
store.dispatch({ type: 'INCREMENT' });
```

## High-Level Design

HyperStore follows a unidirectional data flow architecture with these core components:

### Core Components

1. **StateStore**: Central store holding the application state with a highly optimized update mechanism.

2. **Actions**: Plain JavaScript objects with a `type` field describing state changes.

3. **Reducers**: Pure functions that compute new state based on previous state and an action.

4. **Middleware**: Pluggable functions that intercept actions before they reach reducers.

5. **Selectors**: Functions that extract specific pieces of state with automatic memoization.

6. **Listeners**: Callbacks that are notified when state changes.

7. **Async Actions**: Functions that can dispatch multiple actions asynchronously.

8. **Cancellation System**: Infrastructure for tracking and canceling in-flight requests.

### Data Flow

1. An action is dispatched to the store.
2. The action passes through the middleware chain.
3. The store applies all registered reducers to compute the new state.
4. The store updates selector cache and notifies relevant listeners.
5. Components re-render with the new state.

## Low-Level Design

### StateStore Implementation

The `StateStore` class is the core of the library. It implements:

1. **State Management**: Maintains the state tree and ensures immutability.

2. **Batch Processing**: Groups multiple actions together to minimize updates.
   - Uses `requestAnimationFrame` in browsers for optimal performance
   - Falls back to `setTimeout` with a 4ms delay in other environments

3. **Selector System**: Tracks which parts of the state have changed and only updates affected subscriptions.
   - Uses a two-level cache system for optimal performance
   - Avoids unnecessary re-computations and notifications

4. **Middleware Implementation**: Implements a middleware chain similar to Redux but with optimizations.

### Key Optimizations

1. **Batched Updates**: Multiple actions dispatched in the same tick are processed together.

2. **Efficient State Diffing**: Only notifies listeners when their relevant state has changed.

3. **Selective Reducer Application**: Only applies reducers to state slices that match the action.

4. **Memoized Selectors**: Caches selector results and only updates when inputs change.

5. **Set-based Subscription Management**: Uses JavaScript `Set` for efficient listener tracking.

### Class Structure

```
- StateStore
  - state: T
  - reducers: Map<string, Reducer<any>>
  - listeners: Set<Listener<T>>
  - selectorCache: Map<Selector<T, any>, any>
  - selectorListeners: Map<Selector<T, any>, Set<Listener<any>>>
  - batchedActions: Action[]
  - batchTimeout: number | null
  - middlewareChain: ((action: Action) => void) | null
  - activeRequests: Map<string, CancelationState>

- Action
  - type: string
  - payload?: any
  - meta?: Record<string, any>

- AsyncAction
  - Function that receives dispatch and getState

- CancelableAsyncAction
  - AsyncAction with a cancel method

- Middleware
  - Function that receives store, next, and action
```

## API Reference

### Core Functions

```typescript
// Create a new store
createStore<T>(initialState: T, middlewares?: Middleware<T>[]): StateStore<T>

// Create an array of default middleware
createDefaultMiddleware<T>(): Middleware<T>[]
```

### Store Methods

```typescript
// Get the current state (readonly)
getState(): Readonly<T>

// Register a reducer for a specific slice of state
registerReducer<K extends keyof T>(key: K, reducer: Reducer<T[K]>): void

// Dispatch an action to update state
dispatch(action: Action | AsyncAction<T>): void

// Subscribe to the entire state
subscribe(listener: Listener<T>): Unsubscribe

// Subscribe to a specific slice of state via selector
select<R>(selector: Selector<T, R>, onChange: Listener<R>): Unsubscribe

// Force update state immediately (bypasses batching)
forceUpdate(action: Action): void

// Track an async operation for cancellation support
trackRequest(requestId: string): CancelationState

// Cancel an active request
cancelRequest(requestId: string): boolean

// Complete a request (cleanup)
completeRequest(requestId: string): void
```

### Utility Functions

```typescript
// Create a typed action creator
createAction<P, M>(type: string): (payload?: P, meta?: M) => Action

// Create a debounced action
createDebouncedAction<P>(type: string, wait?: number): (payload?: P) => Action

// Create a cancelable async action
createCancelableAction<T, P>(
  requestId: string,
  actionCreator: (payload: P) => AsyncAction<T>
): (payload: P) => CancelableAsyncAction<T>

// Combine multiple reducers into one
combineReducers<T>(reducers: { [K in keyof T]: Reducer<T[K]> }): Reducer<T>

// Create a reducer from a map of action handlers
createReducer<S>(
  initialState: S,
  handlers: Record<string, (state: S, action: Action) => S>
): Reducer<S>
```

### Middleware

```typescript
// Logger middleware
createLogger<T>(): Middleware<T>

// Thunk middleware for async actions
createThunkMiddleware<T>(): Middleware<T>

// Cancelation middleware for request cancellation
createCancelationMiddleware<T>(): Middleware<T>

// Debounce middleware for high-frequency actions
createDebounceMiddleware<T>(wait?: number): Middleware<T>
```

## Usage Examples

### Basic Usage

```javascript
import { createStore, createReducer, createAction } from 'hyper-store';

// Create actions
const increment = createAction('INCREMENT');
const decrement = createAction('DECREMENT');
const setUser = createAction('SET_USER');

// Create reducers
const counterReducer = createReducer(0, {
  INCREMENT: (state) => state + 1,
  DECREMENT: (state) => state - 1
});

const userReducer = createReducer(null, {
  SET_USER: (state, action) => action.payload
});

// Create store
const store = createStore({
  counter: 0,
  user: null
});

// Register reducers
store.registerReducer('counter', counterReducer);
store.registerReducer('user', userReducer);

// Subscribe to state changes
store.select(state => state.counter, console.log);

// Dispatch actions
store.dispatch(increment());
store.dispatch(setUser({ id: 1, name: 'John' }));
```

### Async Actions

```javascript
import { createStore, createDefaultMiddleware } from 'hyper-store';

// Create store with default middleware
const store = createStore(
  { users: [], loading: false, error: null },
  createDefaultMiddleware()
);

// Create an async action
const fetchUsers = () => async (dispatch, getState) => {
  // Check if already loading
  if (getState().loading) return;
  
  dispatch({ type: 'FETCH_USERS_START' });
  
  try {
    const response = await fetch('https://api.example.com/users');
    const users = await response.json();
    dispatch({ type: 'FETCH_USERS_SUCCESS', payload: users });
  } catch (error) {
    dispatch({ type: 'FETCH_USERS_ERROR', payload: error.message });
  }
};

// Register reducers
store.registerReducer('users', (state = [], action) => {
  switch (action.type) {
    case 'FETCH_USERS_SUCCESS':
      return action.payload;
    default:
      return state;
  }
});

store.registerReducer('loading', (state = false, action) => {
  switch (action.type) {
    case 'FETCH_USERS_START':
      return true;
    case 'FETCH_USERS_SUCCESS':
    case 'FETCH_USERS_ERROR':
      return false;
    default:
      return state;
  }
});

// Dispatch the async action
store.dispatch(fetchUsers());
```

### Cancelable Requests

```javascript
import { 
  createStore, 
  createDefaultMiddleware, 
  createCancelableAction 
} from 'hyper-store';

const store = createStore(
  { data: null, loading: false },
  createDefaultMiddleware()
);

// Define base action
const fetchDataBase = (id) => async (dispatch, getState) => {
  dispatch({ type: 'FETCH_DATA_START' });
  
  try {
    const response = await fetch(`https://api.example.com/data/${id}`);
    const data = await response.json();
    dispatch({ type: 'FETCH_DATA_SUCCESS', payload: data });
    return data;
  } catch (error) {
    dispatch({ type: 'FETCH_DATA_ERROR', payload: error.message });
    throw error;
  }
};

// Create cancelable version
const fetchData = createCancelableAction('data-request', fetchDataBase);

// Usage
const dataRequest = store.dispatch(fetchData('123'));

// Later, if needed:
dataRequest.cancel();
```

## Project Structure

```
hyper-store/
├── src/
│   ├── core/
│   │   ├── store.ts         // StateStore implementation
│   │   └── types.ts         // Core type definitions
│   ├── middleware/
│   │   ├── index.ts         // Middleware exports
│   │   ├── logger.ts        // Logger middleware
│   │   ├── thunk.ts         // Thunk middleware
│   │   ├── cancellation.ts  // Cancellation middleware
│   │   └── debounce.ts      // Debounce middleware
│   ├── utils/
│   │   ├── index.ts         // Utility exports
│   │   ├── action.ts        // Action creators
│   │   └── reducer.ts       // Reducer utilities
│   └── index.ts             // Main entry point
├── package.json
├── tsconfig.json
└── README.md
```

## Performance Considerations

HyperStore is designed for high-performance applications with these optimizations:

1. **Minimal Re-renders**: The selector system ensures components only update when their specific data changes.

2. **Efficient Batch Processing**: Updates are automatically batched to minimize DOM renders.

3. **Fast Diffing**: Uses shallow equality checks for optimal performance.

4. **Memory Efficiency**: Cleanup mechanisms for inactive selectors and completed requests.

5. **Animation Frame Synchronization**: Uses requestAnimationFrame for optimal visual updates.

## Browser Support

HyperStore supports all modern browsers and IE11 with appropriate polyfills. For older browsers, you may need to include polyfills for:

- Map/Set
- Promise
- requestAnimationFrame

## License

MIT

> [!NOTE]
> Generated by Claude