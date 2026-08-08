import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = 'button:not([disabled]):not([tabindex="-1"]), [href]:not([tabindex="-1"]), input:not([disabled]):not([type="hidden"]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(isActive: boolean, onClose?: () => void, isSuspended = false) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  onCloseRef.current = onClose;

  // Capture and restore focus only for the lifetime of the containing modal.
  // Suspending a trap for a nested modal must not restore focus outside it.
  useEffect(() => {
    if (!isActive) return;

    previousActiveElement.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const firstFocusable = focusableElements[0];
    if (firstFocusable) {
      firstFocusable.focus();
    }

    return () => {
      previousActiveElement.current?.focus();
    };
  }, [isActive]);

  // Keyboard handling has a separate lifecycle so a nested dialog can own
  // focus without deactivating the parent trap and triggering focus restore.
  useEffect(() => {
    if (!isActive || isSuspended) return;

    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onCloseRef.current) {
        onCloseRef.current();
        return;
      }

      if (e.key !== "Tab") return;

      const elements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      const first = elements[0];
      const last = elements[elements.length - 1];

      if (!first || !last) return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isActive, isSuspended]);

  return containerRef;
}
