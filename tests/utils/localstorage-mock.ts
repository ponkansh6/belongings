/**
 * Creates a minimal in-memory localStorage mock for use in vitest tests.
 * Call `mockLocalStorage()` in a `beforeEach` to install it on `globalThis`.
 */
export function createLocalStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(String(key), String(value));
    }),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    get length() {
      return store.size;
    },
    key: vi.fn((index: number) => {
      const keys = [...store.keys()];
      return keys[index] ?? null;
    }),
  };
}

export function mockLocalStorage(): void {
  Object.defineProperty(globalThis, "localStorage", {
    value: createLocalStorageMock(),
    writable: true,
    configurable: true,
  });
}
