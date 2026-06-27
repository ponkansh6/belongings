"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface DragState {
  fromIndex: number;
  overIndex: number;
  startY: number;
  currentY: number;
  itemHeight: number;
  /**
   * Whether the drag has moved past the threshold.
   * Until this is true, pointermove doesn't prevent scroll.
   */
  active: boolean;
}

export const LONG_PRESS_DURATION = 250; // ms to hold before drag activates

/**
 * Custom hook for drag-and-drop reordering.
 * Uses pointer events for unified mouse/touch support.
 * Returns styles to apply to each item for visual feedback.
 */
export function useDragReorder(onReorder: (fromIndex: number, toIndex: number) => void) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getIndexFromY = useCallback((clientY: number): number => {
    const container = containerRef.current;
    if (!container) return 0;
    const children = Array.from(container.children).filter(
      (el) => !el.hasAttribute("data-drop-indicator"),
    ) as HTMLElement[];
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return children.length;
  }, []);

  const handlePointerDown = useCallback((index: number, e: React.PointerEvent) => {
    if (e.button !== 0) return;

    // Clear any existing timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const item = containerRef.current?.children[index] as HTMLElement | undefined;
    if (!item) return;

    const rect = item.getBoundingClientRect();
    const state: DragState = {
      fromIndex: index,
      overIndex: index,
      startY: e.clientY,
      currentY: e.clientY,
      itemHeight: rect.height,
      active: false,
    };
    dragRef.current = state;
    setDragState(state);

    // Start long-press timer
    longPressTimerRef.current = setTimeout(() => {
      if (dragRef.current) {
        dragRef.current = { ...dragRef.current, active: true };
        setDragState({ ...dragRef.current! });
      }
    }, LONG_PRESS_DURATION);
  }, []);

  // Always-attached listeners; check dragRef.current to determine if active
  useEffect(() => {
    const cleanUp = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const state = dragRef.current;
      if (!state || !state.active) return;

      e.preventDefault();

      const overIndex = getIndexFromY(e.clientY);
      if (overIndex !== state.overIndex || e.clientY !== state.currentY) {
        const next = { ...state, currentY: e.clientY, overIndex };
        dragRef.current = next;
        setDragState(next);
      }
    };

    const handleEnd = () => {
      cleanUp();
      const state = dragRef.current;
      if (!state) return;
      if (state.active && state.fromIndex !== state.overIndex) {
        // When moving down (fromIndex < overIndex), the item's removal from the
        // array shifts all subsequent indices down by 1. Adjust so the insertion
        // point matches the visual indicator (borderTop on the overIndex item).
        const toIndex =
          state.fromIndex < state.overIndex
            ? state.overIndex - 1
            : state.overIndex;
        if (state.fromIndex !== toIndex) {
          onReorderRef.current(state.fromIndex, toIndex);
        }
      }
      dragRef.current = null;
      setDragState(null);
    };

    /** Cancel drag without committing a reorder */
    const handleCancel = () => {
      cleanUp();
      const state = dragRef.current;
      if (!state) return;
      // Reset overIndex to prevent reorder
      dragRef.current = { ...state, overIndex: state.fromIndex };
      handleEnd();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dragRef.current) {
        handleCancel();
      }
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handleEnd);
    document.addEventListener("pointercancel", handleCancel);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cleanUp();
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handleEnd);
      document.removeEventListener("pointercancel", handleCancel);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [getIndexFromY]);

  /** Returns CSSProperties for an item at the given index during a drag */
  const getItemStyle = useCallback(
    (index: number): React.CSSProperties => {
      if (!dragState || !dragState.active) return { opacity: 1 };

      const { fromIndex, overIndex } = dragState;

      // Dim the dragged item — no pointer-tracking animation
      if (index === fromIndex) {
        return {
          opacity: 0.3,
          zIndex: 10,
        };
      }

      // Show drop indicator (blue line) at the insertion point
      if (overIndex !== fromIndex && index === overIndex) {
        return {
          borderTop: "2px solid #3b82f6",
          opacity: 1,
        };
      }

      return { opacity: 1 };
    },
    [dragState],
  );

  return {
    dragState,
    containerRef,
    handlePointerDown,
    getItemStyle,
    isDragging: dragState !== null,
  };
}
