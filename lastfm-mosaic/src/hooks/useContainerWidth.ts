import { useEffect, useState } from "react";

/**
 * Tracks the content width of an element with a ResizeObserver. Width is 0 until first measured.
 * The ref is a callback ref, so the element can mount later than the component using the hook
 * (the mosaic panel only exists once data is loaded) and is observed whenever it appears.
 */
export function useContainerWidth<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return [setElement, width] as const;
}
