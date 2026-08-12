import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

if (typeof document !== 'undefined') {
  afterEach(() => cleanup())
}

if (typeof window !== 'undefined') {
  const storage = new Map<string, string>()
  const localStorageMock: Storage = {
    get length() {
      return storage.size
    },
    clear: () => storage.clear(),
    getItem: (key) => storage.get(key) ?? null,
    key: (index) => Array.from(storage.keys())[index] ?? null,
    removeItem: (key) => storage.delete(key),
    setItem: (key, value) => storage.set(key, String(value)),
  }

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: localStorageMock,
  })

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  })

  Object.defineProperty(window, 'requestAnimationFrame', {
    writable: true,
    value: (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(performance.now()), 0),
  })
}
