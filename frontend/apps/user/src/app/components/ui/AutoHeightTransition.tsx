import React, { useLayoutEffect, useRef, useState } from "react";

interface AutoHeightTransitionProps {
  children: React.ReactNode;
  /**
   * Changes whenever the rendered content's identity changes (e.g. a phase
   * name like "loading" -> "taking"). A change triggers the height
   * animation; anything else (re-renders with the same key) just keeps the
   * container's height in sync immediately, no animation.
   */
  transitionKey: string;
  className?: string;
}

/**
 * Softens the layout shift when swapping in differently-sized content (e.g.
 * a loading skeleton -> real async content whose height isn't known ahead
 * of time) by animating the container's height instead of snapping to it.
 * This does not eliminate the shift — the real content's size is still
 * unknown until it arrives — it only makes it read as a smooth expand
 * instead of a sudden jump.
 */
export const AutoHeightTransition: React.FC<AutoHeightTransitionProps> = ({
  children,
  transitionKey,
  className,
}) => {
  const innerRef = useRef<HTMLDivElement>(null);
  const lastHeightRef = useRef(0);
  const prevKeyRef = useRef(transitionKey);
  const [height, setHeight] = useState<number | "auto">("auto");

  useLayoutEffect(() => {
    const node = innerRef.current;
    if (!node) return;
    const nextHeight = node.scrollHeight;

    if (prevKeyRef.current === transitionKey) {
      // Same content identity — keep height in sync without animating
      // (e.g. expanding an explanation panel within the same phase).
      setHeight(nextHeight);
      lastHeightRef.current = nextHeight;
      return;
    }
    prevKeyRef.current = transitionKey;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) {
      setHeight(nextHeight);
      lastHeightRef.current = nextHeight;
      return;
    }

    // Freeze at the last known height first (new content is already in the
    // DOM at this point but visually clipped by overflow-hidden), then
    // animate to the real height on the next frame so the browser has a
    // starting point to transition from.
    setHeight(lastHeightRef.current);
    requestAnimationFrame(() => {
      setHeight(nextHeight);
      lastHeightRef.current = nextHeight;
    });
  }, [transitionKey, children]);

  return (
    <div
      className={className}
      style={{ height, overflow: "hidden", transition: "height 250ms ease" }}
    >
      <div ref={innerRef}>{children}</div>
    </div>
  );
};

export default AutoHeightTransition;
