import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

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
  const frameRef = useRef<number | null>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useLayoutEffect(() => {
    const node = innerRef.current;
    if (!node) return;
    const nextHeight = node.scrollHeight;

    if (prevKeyRef.current === transitionKey) {
      // The first committed render (including a cache-hit quiz revisit) must
      // remain naturally sized. Freezing that render to a measured pixel
      // height can leave Safari clipping content at 0px when its layout is
      // finalized after this effect.
      setHeight("auto");
      lastHeightRef.current = nextHeight;
      return;
    }
    prevKeyRef.current = transitionKey;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) {
      setHeight("auto");
      lastHeightRef.current = nextHeight;
      return;
    }

    // Freeze at the last known height first (new content is already in the
    // DOM at this point but visually clipped by overflow-hidden), then
    // animate to the real height on the next frame so the browser has a
    // starting point to transition from.
    setHeight(lastHeightRef.current);
    frameRef.current = requestAnimationFrame(() => {
      setHeight(nextHeight);
      lastHeightRef.current = nextHeight;
      frameRef.current = null;
    });

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [transitionKey, children]);

  // Content can finish laying out after the transition effect (notably in
  // Safari and when React Query resolves from cache). Once the animation is
  // over, release the fixed height so later layout changes cannot be clipped.
  useEffect(() => {
    const node = innerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      lastHeightRef.current = node.scrollHeight;
      setHeight("auto");
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={className}
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget && event.propertyName === "height") {
          setHeight("auto");
        }
      }}
      style={{ height, overflow: "hidden", transition: "height 250ms ease" }}
    >
      <div ref={innerRef}>{children}</div>
    </div>
  );
};

export default AutoHeightTransition;
