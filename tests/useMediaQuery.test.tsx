import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

function QueryResult({ query }: { query: string }) {
  const matches = useMediaQuery(query);
  return <output>{String(matches)}</output>;
}

function mockMediaQueryList(initialMatches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mediaQueryList = {
    matches: initialMatches,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    }),
    dispatchEvent: vi.fn(() => true),
  } as unknown as MediaQueryList;

  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => mediaQueryList),
  );

  return {
    mediaQueryList,
    emit(matches: boolean) {
      act(() => {
        for (const listener of listeners) {
          listener({ matches } as MediaQueryListEvent);
        }
      });
    },
    listenerCount: () => listeners.size,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useMediaQuery", () => {
  it.each([true, false])("uses the initial matchMedia value (%s)", (matches) => {
    const { mediaQueryList } = mockMediaQueryList(matches);

    render(<QueryResult query="(prefers-reduced-motion: reduce)" />);

    expect(screen.getByText(String(matches))).toBeInTheDocument();
    expect(window.matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
    expect(mediaQueryList.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("updates when the preference changes and removes its listener on unmount", () => {
    const { mediaQueryList, emit, listenerCount } = mockMediaQueryList(false);
    const { unmount } = render(<QueryResult query="(prefers-reduced-motion: reduce)" />);

    expect(screen.getByText("false")).toBeInTheDocument();
    emit(true);
    expect(screen.getByText("true")).toBeInTheDocument();

    unmount();

    expect(mediaQueryList.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(listenerCount()).toBe(0);
  });
});
