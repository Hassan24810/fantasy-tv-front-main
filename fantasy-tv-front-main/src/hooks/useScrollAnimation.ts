import { createContext, useContext, useEffect, useRef, useState } from "react";

/**
 * When true, scroll animations are bypassed and elements are always visible.
 * Used in the onboarding preview panel where IntersectionObserver may not trigger.
 */
export const SkipScrollAnimationContext = createContext(false);

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useScrollAnimation<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollAnimationOptions = {}
) {
  const { threshold = 0.1, rootMargin = "0px 0px -50px 0px", triggerOnce = true } = options;
  const ref = useRef<T>(null);
  const skipAnimation = useContext(SkipScrollAnimationContext);
  const [isVisible, setIsVisible] = useState(skipAnimation);

  useEffect(() => {
    if (skipAnimation) {
      setIsVisible(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce, skipAnimation]);

  return { ref, isVisible };
}
