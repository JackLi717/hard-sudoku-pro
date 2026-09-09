import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

// Navigation memory belongs to the running app, not a mounted page. Game data
// and preferences retain their existing durable repositories. No timers, native
// handles, pending operations, or modal visibility belong in this store.
class ScreenStateStore {
  private values = new Map<string, unknown>();
  private listeners = new Map<string, Set<() => void>>();

  read<T>(key: string, fallback: T): T {
    return this.values.has(key) ? (this.values.get(key) as T) : fallback;
  }

  write<T>(key: string, value: T): void {
    if (Object.is(this.values.get(key), value) && this.values.has(key)) return;
    this.values.set(key, value);
    this.listeners.get(key)?.forEach(listener => listener());
  }

  subscribe(key: string, listener: () => void): () => void {
    const listeners = this.listeners.get(key) ?? new Set();
    listeners.add(listener);
    this.listeners.set(key, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.listeners.delete(key);
    };
  }
}

const ScreenStateContext = createContext<ScreenStateStore | null>(null);

export function ScreenStateProvider({ children }: React.PropsWithChildren) {
  const [store] = useState(() => new ScreenStateStore());
  return (
    <ScreenStateContext.Provider value={store}>
      {children}
    </ScreenStateContext.Provider>
  );
}

function useScreenStateStore() {
  const shared = useContext(ScreenStateContext);
  // Standalone screens in tests/previews keep ordinary component-local state.
  const [local] = useState(() => new ScreenStateStore());
  return shared ?? local;
}

export function useScreenState<T>(
  key: string,
  initial: T | (() => T),
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const store = useScreenStateStore();
  const initializer = useRef(initial);
  initializer.current = initial;
  const fallback = useMemo(() => {
    // The key is the identity of the page/session/fixture, so a changed key
    // must receive its own initial value even if the component stays mounted.
    const value = initializer.current;
    return {
      key,
      value: typeof value === 'function' ? (value as () => T)() : value,
    };
  }, [key]).value;
  const subscribe = useCallback(
    (listener: () => void) => store.subscribe(key, listener),
    [store, key],
  );
  const read = useCallback(
    () => store.read(key, fallback),
    [store, key, fallback],
  );
  const value = useSyncExternalStore(subscribe, read, read);
  const setValue = useCallback(
    (update: React.SetStateAction<T>) => {
      const current = store.read(key, fallback);
      store.write(
        key,
        typeof update === 'function'
          ? (update as (value: T) => T)(current)
          : update,
      );
    },
    [store, key, fallback],
  );
  return [value, setValue];
}

export function useScreenScroll(key: string) {
  const store = useScreenStateStore();
  const contentOffset = useMemo(
    () => store.read(`scroll:${key}`, { x: 0, y: 0 }),
    [store, key],
  );
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { x, y } = event.nativeEvent.contentOffset;
      store.write(`scroll:${key}`, { x: Math.max(0, x), y: Math.max(0, y) });
    },
    [store, key],
  );
  // Do not subscribe or change contentOffset during scrolling: restoring is
  // only for navigation/remount, and must never fight the player's gesture.
  return { contentOffset, onScroll, scrollEventThrottle: 100 };
}
