"use client";

import { useEffect, useRef, useState, ReactNode } from "react";

interface ScrollAnimationProps {
  children: ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "scale";
  className?: string;
}

export function ScrollAnimation({ 
  children, 
  delay = 0, 
  direction = "up",
  className = "" 
}: ScrollAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setIsVisible(true);
            }, delay);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [delay]);

  const directionClasses = {
    up: isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12",
    down: isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-12",
    left: isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-12",
    right: isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12",
    scale: isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95",
  };

  return (
    <div
      ref={elementRef}
      className={`transition-all duration-700 ease-out ${directionClasses[direction]} ${className}`}
    >
      {children}
    </div>
  );
}

