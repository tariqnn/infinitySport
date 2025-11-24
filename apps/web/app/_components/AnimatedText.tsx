"use client";
import { useEffect, useState, type ReactNode } from "react";

interface AnimatedTextProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "down" | "left" | "right";
}

export function AnimatedText({
  children,
  delay = 0,
  className = "",
  direction = "up"
}: AnimatedTextProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const directionClasses = {
    up: "translate-y-8",
    down: "-translate-y-8",
    left: "translate-x-8",
    right: "-translate-x-8"
  };

  return (
    <div
      className={`transition-all duration-700 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0 translate-x-0"
          : `opacity-0 ${directionClasses[direction]}`
      } ${className}`}
    >
      {children}
    </div>
  );
}

interface AnimatedSectionProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function AnimatedSection({ children, delay = 0, className = "" }: AnimatedSectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setTimeout(() => {
              setIsVisible(true);
              setHasAnimated(true);
            }, delay);
          }
        });
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById(`animated-section-${delay}`);
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [delay, hasAnimated]);

  return (
    <div
      id={`animated-section-${delay}`}
      className={`transition-all duration-1000 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-12"
      } ${className}`}
    >
      {children}
    </div>
  );
}

