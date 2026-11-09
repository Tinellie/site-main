"use client";

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from "react";
import Backdrop, { type BackdropProps } from "@mui/material/Backdrop";

export const ViewportBackdrop = forwardRef<HTMLDivElement, BackdropProps>(
  function ViewportBackdrop(props, forwardedRef) {
    const ref = useRef<HTMLDivElement>(null);
    useImperativeHandle(forwardedRef, () => ref.current!, []);

    useLayoutEffect(() => {
      const root = document.documentElement;
      const bounds = root.getBoundingClientRect();
      const computed = getComputedStyle(root);
      const previous = {
        gutter: root.style.scrollbarGutter,
        left: root.style.paddingLeft,
        right: root.style.paddingRight,
      };
      // Native root gutters are outside the document's painted backdrop area.
      root.style.paddingLeft = `${parseFloat(computed.paddingLeft) + bounds.left}px`;
      root.style.paddingRight = `${parseFloat(computed.paddingRight) + window.innerWidth - bounds.right}px`;
      root.style.scrollbarGutter = "auto";
      return () => {
        root.style.scrollbarGutter = previous.gutter;
        root.style.paddingLeft = previous.left;
        root.style.paddingRight = previous.right;
      };
    }, []);

    return <Backdrop {...props} ref={ref} />;
  },
);
