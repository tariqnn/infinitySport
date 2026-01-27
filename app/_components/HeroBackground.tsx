"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Slide = {
  src: string;
  alt: string;
};

export function HeroBackground({ slides, interval = 6000 }: { slides: Slide[]; interval?: number }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % slides.length);
    }, interval);

    return () => window.clearInterval(timer);
  }, [interval, slides.length]);

  return (
    <div className="absolute inset-0">
      {slides.map((slide, index) => (
        <div
          key={`${slide.src}-${index}`}
          className={`absolute inset-0 transition-opacity duration-[1800ms] ease-out ${
            index === activeIndex ? "opacity-100" : "opacity-0"
          }`}
        >
                  <Image
                    src={slide.src}
                    alt={slide.alt}
                    fill
                    priority={index === 0}
                    sizes="100vw"
                    className="h-full w-full object-cover object-center"
                    unoptimized
                  />
        </div>
      ))}
    </div>
  );
}

