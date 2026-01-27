"use client";

import { useState } from "react";
import Image from "next/image";
import { ScrollAnimation } from "./ScrollAnimation";

interface Facility {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  specs?: string[];
}

interface FacilitiesSectionProps {
  facilities: Facility[];
}

export function FacilitiesSection({ facilities }: FacilitiesSectionProps) {
  const [expandedFacility, setExpandedFacility] = useState<string | null>(null);

  // Toggle facility expansion
  const toggleFacility = (facilityId: string) => {
    setExpandedFacility(prev => prev === facilityId ? null : facilityId);
  };

  // Truncate description to 150 characters
  const truncateDescription = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <section id="facilities" className="bg-white py-12 sm:py-16 md:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollAnimation direction="up">
          <div className="flex flex-col gap-3 sm:gap-4 text-center mb-12">
            <p className="text-xs uppercase tracking-[0.3em] text-brand-green-dark font-bold sm:text-sm">Facility Highlights</p>
            <h2 className="text-3xl font-black text-brand-black leading-tight sm:text-4xl md:text-5xl">Our Facility & Venues</h2>
            <p className="max-w-2xl mx-auto text-base text-gray-600 leading-relaxed sm:text-lg">
              Infinity offers multiple premium spaces for training, events, and private sessions.
            </p>
          </div>
        </ScrollAnimation>

        {/* Facilities List - Stacked Vertically */}
        {facilities.length > 0 ? (
          <div className="mt-8 space-y-6 sm:mt-12 sm:space-y-8 lg:mt-16">
            {facilities.map((facility, index) => {
              const isExpanded = expandedFacility === facility.id;
              const description = isExpanded 
                ? facility.description 
                : truncateDescription(facility.description);
              const showReadMore = facility.description.length > 150;

              return (
                <ScrollAnimation 
                  key={facility.id} 
                  direction="up" 
                  delay={index * 100}
                >
                  <div 
                    className="rounded-2xl border-2 border-brand-lightBlue/20 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-3 hover:border-brand-green-primary/60 hover:shadow-[0_16px_48px_rgba(20,26,255,0.2)] cursor-pointer p-6 sm:p-8"
                    onClick={() => toggleFacility(facility.id)}
                  >
                    <div className={`${isExpanded ? 'flex flex-row gap-6' : 'flex flex-col'}`}>
                      {facility.imageUrl && (
                        <div className={`${isExpanded ? 'w-64 h-64 flex-shrink-0' : 'w-full mb-4 -mt-2 -mx-2 sm:-mt-4 sm:-mx-4'}`}>
                          <div className={`relative ${isExpanded ? 'h-64 w-64' : 'h-48 w-full'} overflow-hidden ${isExpanded ? 'rounded-xl' : 'rounded-t-2xl'}`}>
                            <Image
                              src={facility.imageUrl}
                              alt={facility.name}
                              fill
                              className="object-cover"
                              sizes={isExpanded ? "256px" : "(max-width: 768px) 100vw, 100vw"}
                            />
                          </div>
                        </div>
                      )}
                      <div className="flex-grow flex flex-col">
                        <div className="flex-shrink-0">
                          <h3 className="text-2xl font-black text-brand-black">{facility.name}</h3>
                        </div>
                        <div className="mt-4">
                          <div 
                            className="text-sm text-gray-600 leading-relaxed"
                            style={!isExpanded ? {
                              display: '-webkit-box',
                              WebkitLineClamp: 4,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            } : {}}
                          >
                            {description}
                          </div>
                          {showReadMore && (
                            <button 
                              className="mt-2 text-xs font-semibold text-brand-green-primary hover:text-brand-green-dark transition-colors self-start"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFacility(facility.id);
                              }}
                            >
                              {isExpanded ? 'Read less' : 'Read more'}
                            </button>
                          )}
                          {isExpanded && facility.specs && facility.specs.length > 0 && (
                            <ul className="mt-4 space-y-1.5 text-xs text-gray-600">
                              {facility.specs.map((spec, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-green-primary" />
                                  <span>{spec}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollAnimation>
              );
            })}
          </div>
        ) : (
          <ScrollAnimation direction="up" delay={200}>
            <div className="text-center py-12">
              <p className="text-lg text-gray-600">No facilities available at the moment.</p>
            </div>
          </ScrollAnimation>
        )}
      </div>
    </section>
  );
}


