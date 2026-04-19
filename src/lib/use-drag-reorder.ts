"use client";

import { useState } from "react";

/**
 * Lightweight HTML5 drag-reorder hook. Used for reorderable lists that persist
 * their order via an id array (e.g. zustand `accountOrder`).
 *
 * Usage:
 *   const dr = useDragReorder<number>(ids, (next) => saveOrder(next));
 *   <div draggable {...dr.itemProps(id)}>...</div>
 */
export function useDragReorder<TId extends string | number>(
  ids: TId[],
  onChange: (next: TId[]) => void
) {
  const [draggingId, setDraggingId] = useState<TId | null>(null);
  const [overId, setOverId] = useState<TId | null>(null);

  function itemProps(id: TId) {
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent<HTMLElement>) => {
        setDraggingId(id);
        e.dataTransfer.effectAllowed = "move";
        try {
          e.dataTransfer.setData("text/plain", String(id));
        } catch {
          /* noop */
        }
      },
      onDragOver: (e: React.DragEvent<HTMLElement>) => {
        if (draggingId == null || draggingId === id) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (overId !== id) setOverId(id);
      },
      onDrop: (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
        if (draggingId == null || draggingId === id) {
          setDraggingId(null);
          setOverId(null);
          return;
        }
        const from = ids.indexOf(draggingId);
        const to = ids.indexOf(id);
        if (from === -1 || to === -1) {
          setDraggingId(null);
          setOverId(null);
          return;
        }
        const next = [...ids];
        next.splice(from, 1);
        next.splice(to, 0, draggingId);
        onChange(next);
        setDraggingId(null);
        setOverId(null);
      },
      onDragEnd: () => {
        setDraggingId(null);
        setOverId(null);
      },
    };
  }

  return {
    draggingId,
    overId,
    isDragging: (id: TId) => draggingId === id,
    isOver: (id: TId) => overId === id,
    itemProps,
  };
}
