"use client";

import {
  useEffect, useRef, useState,
  type KeyboardEvent, type PointerEvent, type RefObject,
} from "react";

import { Box } from "@mui/material";

export function PageScrollbar({
  scrollRef,
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const [metrics, setMetrics] = useState({
    height: 0,
    scrollHeight: 0,
    scrollTop: 0,
  });
  const drag = useRef<{ pointerId: number; offset: number } | null>(null);

  useEffect(() => {
    const page = scrollRef.current;
    if (!page) return;

    function measure() {
      if (!page) return;
      const next = {
        height: page.clientHeight,
        scrollHeight: page.scrollHeight,
        scrollTop: page.scrollTop,
      };
      setMetrics((previous) =>
        previous.height === next.height &&
        previous.scrollHeight === next.scrollHeight &&
        previous.scrollTop === next.scrollTop
          ? previous
          : next,
      );
    }

    const resizeObserver = new ResizeObserver(measure);
    function observeContent() {
      if (!page) return;
      resizeObserver.disconnect();
      resizeObserver.observe(page);
      for (const child of page.children) resizeObserver.observe(child);
    }
    const mutationObserver = new MutationObserver(observeContent);
    observeContent();
    mutationObserver.observe(page, { childList: true });
    page.addEventListener("scroll", measure, { passive: true });
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      page.removeEventListener("scroll", measure);
    };
  }, [scrollRef]);

  const maximum = Math.max(0, metrics.scrollHeight - metrics.height);
  if (maximum <= 0) return null;

  const thumbHeight = Math.min(
    metrics.height,
    Math.max(32, (metrics.height * metrics.height) / metrics.scrollHeight),
  );
  const travel = metrics.height - thumbHeight;
  const position = Math.max(0, Math.min(maximum, metrics.scrollTop));
  const thumbTop = (position / maximum) * travel;

  function moveToPointer(event: PointerEvent<HTMLDivElement>, offset: number) {
    const page = scrollRef.current;
    if (!page || travel <= 0) return;
    const top = event.currentTarget.getBoundingClientRect().top;
    page.scrollTop = ((event.clientY - top - offset) / travel) * maximum;
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    const top = event.currentTarget.getBoundingClientRect().top;
    const offset = event.target === event.currentTarget
      ? thumbHeight / 2
      : event.clientY - top - thumbTop;
    drag.current = { pointerId: event.pointerId, offset };
    event.currentTarget.setPointerCapture(event.pointerId);
    moveToPointer(event, offset);
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const page = scrollRef.current;
    if (!page) return;
    let next: number;
    switch (event.key) {
      case "ArrowUp": next = page.scrollTop - 40; break;
      case "ArrowDown": next = page.scrollTop + 40; break;
      case "PageUp": next = page.scrollTop - page.clientHeight; break;
      case "PageDown": next = page.scrollTop + page.clientHeight; break;
      case "Home": next = 0; break;
      case "End": next = maximum; break;
      default: return;
    }
    event.preventDefault();
    page.scrollTop = next;
  }

  return (
    <Box
      id="ss-scrollbar"
      role="scrollbar"
      aria-label="页面滚动条"
      aria-controls="ss-page"
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={maximum}
      aria-valuenow={position}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={(event) => {
        if (drag.current?.pointerId === event.pointerId) {
          moveToPointer(event, drag.current.offset);
        }
      }}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onLostPointerCapture={() => { drag.current = null; }}
      onWheel={(event) => {
        const page = scrollRef.current;
        if (!page) return;
        const unit = event.deltaMode === 1 ? 16
          : event.deltaMode === 2 ? page.clientHeight : 1;
        page.scrollTop += event.deltaY * unit;
      }}
      sx={{
        gridArea: "2 / 1 / 3 / 2",
        justifySelf: "end",
        position: "relative",
        zIndex: 1,
        width: 10,
        minHeight: 0,
        touchAction: "none",
        userSelect: "none",
        "&:hover .psb-thumb, &:focus-visible .psb-thumb": {
          bgcolor: "rgba(255, 255, 255, 0.5)",
        },
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: -2,
        },
      }}
    >
      <Box
        className="psb-thumb"
        sx={{
          position: "absolute",
          top: thumbTop,
          right: 2,
          width: 6,
          height: thumbHeight,
          borderRadius: 8,
          bgcolor: "rgba(255, 255, 255, 0.3)",
          pointerEvents: "auto",
        }}
      />
    </Box>
  );
}
