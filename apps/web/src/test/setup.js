import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom has no media-query engine. Default to reduced motion in component tests.
Object.defineProperty(window, 'matchMedia', { writable: true, value: (media) => ({
  media, matches: media.includes('prefers-reduced-motion: reduce'), onchange: null,
  addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
}) });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
  localStorage.clear();
});
