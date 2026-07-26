'use client';

import { useEffect, useState } from 'react';

export function EventGallery({ images, title }: { images: string[]; title: string }) {
  const [selected, setSelected] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!lightboxOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [lightboxOpen]);

  if (images.length === 0) return null;
  const current = images[selected] || images[0];

  return (
    <>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="group relative overflow-hidden rounded-2xl bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
          aria-label="Open gallery image"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current} alt={`${title} gallery image ${selected + 1}`} className="aspect-[16/10] h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
          <span className="absolute bottom-4 right-4 rounded-full bg-black/70 px-3 py-1.5 text-xs font-bold text-white">
            View full size
          </span>
        </button>
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setSelected(index)}
              className={`overflow-hidden rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-[#003DA5] ${
                selected === index ? 'border-[#003DA5]' : 'border-transparent'
              }`}
              aria-label={`Show gallery image ${index + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" className="aspect-video h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {lightboxOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} gallery image`}
          className="fixed inset-0 z-[100] grid place-items-center bg-black/95 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-5 top-5 min-h-11 rounded-full bg-white/10 px-4 text-sm font-bold text-white hover:bg-white/20"
          >
            Close
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current}
            alt={`${title} gallery image ${selected + 1}`}
            className="max-h-[88vh] max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
