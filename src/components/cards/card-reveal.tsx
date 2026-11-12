"use client";

import {
  createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from "react";
import { Alert, Box } from "@mui/material";

interface RevealEntry {
  element: HTMLElement;
  ready: boolean;
  revealed: boolean;
  reveal: () => void;
}

function createRevealSequence() {
  const entries = new Set<RevealEntry>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  function schedule(delay = 0) {
    if (timer !== undefined) return;
    timer = setTimeout(() => {
      timer = undefined;
      const next = [...entries]
        .filter(entry => !entry.revealed)
        .sort((a, b) => a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)[0];
      if (!next?.ready) return;
      next.revealed = true;
      next.reveal();
      schedule(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 100);
    }, delay);
  }

  return {
    register(element: HTMLElement, reveal: () => void) {
      const entry: RevealEntry = { element, reveal, ready: false, revealed: false };
      entries.add(entry);
      return {
        ready() { entry.ready = true; schedule(); },
        remove() {
          entries.delete(entry);
          if (!entries.size && timer !== undefined) {
            clearTimeout(timer);
            timer = undefined;
          } else schedule();
        },
      };
    },
  };
}

const RevealContext = createContext<ReturnType<typeof createRevealSequence> | null>(null);

export function CardRevealGroup({ children }: { children: ReactNode }) {
  const sequence = useMemo(() => createRevealSequence(), []);
  return <RevealContext.Provider value={sequence}>{children}</RevealContext.Provider>;
}

export function CardReveal({ children }: { children: ReactNode }) {
  const sequence = useContext(RevealContext);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let active = true;
    let completed = false;
    let failure = "";
    const registration = sequence?.register(element, () => {
      setError(failure);
      setVisible(true);
    });
    const images = [...element.querySelectorAll("img")];
    const pending = new Set(images);
    const cleanups: (() => void)[] = [];

    function finish() {
      if (!active || completed) return;
      completed = true;
      clearTimeout(timeout);
      if (registration) registration.ready();
      else { setError(failure); setVisible(true); }
    }

    const timeout = setTimeout(() => {
      failure = "图片加载超时，可刷新页面重试。";
      finish();
    }, 8_000);

    function settle(image: HTMLImageElement, failed: boolean) {
      if (!active || completed || !pending.has(image)) return;
      if (failed) failure = "图片加载失败，可刷新页面重试。";
      pending.delete(image);
      if (!pending.size) finish();
    }

    for (const image of images) {
      // Hidden cards must not wait on viewport-based lazy loading.
      image.loading = "eager";
      const loaded = () => {
        if (!image.naturalWidth) { settle(image, true); return; }
        const source = image.currentSrc;
        void image.decode().then(() => {
          if (image.currentSrc === source) settle(image, false);
          else if (image.complete && image.naturalWidth) loaded();
        }, () => {
          // Responsive sources can change while decoding; wait for the new image.
          if (!image.complete) return;
          if (image.currentSrc !== source && image.naturalWidth) loaded();
          else settle(image, true);
        });
      };
      const failed = () => settle(image, true);
      image.addEventListener("load", loaded);
      image.addEventListener("error", failed);
      cleanups.push(() => {
        image.removeEventListener("load", loaded);
        image.removeEventListener("error", failed);
      });
      if (image.complete && image.naturalWidth) loaded();
    }
    if (!images.length) finish();

    return () => {
      active = false;
      clearTimeout(timeout);
      cleanups.forEach(cleanup => cleanup());
      registration?.remove();
    };
  }, [sequence]);

  return (
    <Box
      ref={ref}
      className="card-reveal"
      data-revealed={visible}
      aria-hidden={!visible}
      inert={!visible}
      sx={{
        position: "relative", minWidth: 0, height: "100%",
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(12px)",
        transition: "opacity 320ms ease-out, transform 320ms ease-out",
        "@media (prefers-reduced-motion: reduce)": { transition: "none", transform: "none" },
      }}
    >
      {children}
      {error && <Alert severity="warning" sx={{
        position: "absolute", bottom: 4, left: 4, right: 4, py: 0, fontSize: "0.75rem",
      }}>{error}</Alert>}
    </Box>
  );
}
