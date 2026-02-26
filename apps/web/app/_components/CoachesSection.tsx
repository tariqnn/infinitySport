"use client";

import { useCallback, useMemo, useState } from "react";
import { ScrollAnimation } from "./ScrollAnimation";

export interface CoachCard {
  id: string;
  sport: string;
  name: string;
  description: string;
  quote?: string;
  achievements?: string[];
  imageUrl: string;
  isActive?: boolean;
}

interface CoachesSectionProps {
  coaches: CoachCard[];
}

function academyBySport(sport: string): string | null {
  const normalized = sport.trim().toLowerCase();
  if (normalized === "basketball") return "Infinity Sports Basketball Academy";
  if (normalized === "volleyball") return "Powered by Spikers Academy";
  if (normalized === "gymnastics") return "Powered by Phoenix Academy";
  return null;
}

function normalizeImageUrl(input: string): string {
  const raw = (input || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("/")) return raw;
  const normalized = raw.replace(/\\/g, "/");
  const filename = normalized.split("/").filter(Boolean).pop();
  return filename ? `/${filename}` : "";
}

export function CoachesSection({ coaches }: CoachesSectionProps) {
  const [selectedSport, setSelectedSport] = useState<string>("All");
  const [expandedCoach, setExpandedCoach] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const visibleCoaches = useMemo(
    () => coaches.filter((coach) => coach.isActive !== false),
    [coaches]
  );

  const sports = useMemo(
    () => ["All", ...Array.from(new Set(visibleCoaches.map((coach) => coach.sport.trim()).filter(Boolean)))],
    [visibleCoaches]
  );

  const filteredCoaches = useMemo(() => {
    if (selectedSport === "All") return visibleCoaches;
    return visibleCoaches.filter((coach) => coach.sport === selectedSport);
  }, [selectedSport, visibleCoaches]);

  const toggleCoach = useCallback((coachId: string) => {
    setExpandedCoach((prev) => (prev === coachId ? null : coachId));
  }, []);

  return (
    <section id="trainer" className="bg-gray-50 py-12 sm:py-16 md:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollAnimation direction="up">
          <div className="mb-12 flex flex-col gap-3 text-center sm:gap-4">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-green-dark sm:text-sm">Trainer</p>
            <h2 className="text-3xl font-black leading-tight text-brand-black sm:text-4xl md:text-5xl">Our Coaching Team</h2>
          </div>
        </ScrollAnimation>

        <ScrollAnimation direction="up" delay={50}>
          <div className="mx-auto mb-16 max-w-4xl">
            <div className="rounded-2xl border-2 border-brand-lightBlue/20 bg-white p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)] sm:p-12">
              <h3 className="mb-4 text-2xl font-black text-brand-black">About Our Coaches</h3>
              <p className="text-base leading-relaxed text-gray-600 sm:text-lg">
                Our coaching team consists of experienced professionals who are passionate about developing young
                athletes across multiple sports disciplines.
              </p>
            </div>
          </div>
        </ScrollAnimation>

        {sports.length > 1 ? (
          <ScrollAnimation direction="up" delay={100}>
            <div className="mb-8 flex flex-wrap justify-center gap-3 sm:mb-12">
              {sports.map((sport) => (
                <button
                  key={sport}
                  onClick={() => {
                    setSelectedSport(sport);
                    setExpandedCoach(null);
                  }}
                  className={`rounded-full px-6 py-3 text-sm font-semibold transition-all duration-300 ${
                    selectedSport === sport
                      ? "scale-105 bg-[#003DA5] text-white shadow-lg"
                      : "border-2 border-brand-lightBlue/20 bg-white text-brand-black hover:border-[#003DA5]/60 hover:shadow-md"
                  }`}
                >
                  {sport}
                </button>
              ))}
            </div>
          </ScrollAnimation>
        ) : null}

        {filteredCoaches.length > 0 ? (
          <div className="mt-8 space-y-6 sm:mt-12 sm:space-y-8 lg:mt-16">
            {filteredCoaches.map((coach, index) => {
              const isExpanded = expandedCoach === coach.id;
              const showReadMore = coach.description.length > 150;
              const description = isExpanded ? coach.description : `${coach.description.slice(0, 150)}${showReadMore ? "..." : ""}`;
              const normalizedImageUrl = normalizeImageUrl(coach.imageUrl);
              const hasImage = normalizedImageUrl.length > 0 && !brokenImages[coach.id];

              return (
                <ScrollAnimation key={coach.id} direction="up" delay={index * 100}>
                  <div
                    className="cursor-pointer overflow-hidden rounded-2xl border-2 border-brand-lightBlue/20 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-2 hover:border-brand-green-primary/60 hover:shadow-[0_16px_48px_rgba(20,26,255,0.2)]"
                    onClick={() => toggleCoach(coach.id)}
                  >
                    <div className={`${isExpanded ? "flex flex-col gap-5 p-5 sm:flex-row sm:p-8" : "flex gap-4 p-4 sm:p-6"}`}>
                      <div className={`${isExpanded ? "h-64 w-full sm:w-64" : "h-24 w-24 sm:h-32 sm:w-32"} flex-shrink-0 overflow-hidden rounded-xl bg-slate-100`}>
                        {hasImage ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={normalizedImageUrl}
                              alt={coach.name}
                              className="h-full w-full object-cover"
                              loading={index < 3 ? "eager" : "lazy"}
                              onError={() => {
                                setBrokenImages((prev) => ({ ...prev, [coach.id]: true }));
                              }}
                            />
                          </>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-grow">
                        <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-green-dark">{coach.sport}</p>
                        {academyBySport(coach.sport) ? (
                          <p className="mt-1 text-sm font-semibold text-brand-blue-primary">{academyBySport(coach.sport)}</p>
                        ) : null}
                        <h3 className={`mt-2 font-black text-brand-black ${isExpanded ? "text-2xl" : "text-lg sm:text-xl"}`}>{coach.name}</h3>
                        <p className={`${isExpanded ? "mt-4 text-sm" : "mt-2 text-xs sm:text-sm"} leading-relaxed text-gray-600`}>{description}</p>
                        {showReadMore ? (
                          <button
                            className="mt-2 text-xs font-semibold text-brand-green-primary transition-colors hover:text-brand-green-dark"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleCoach(coach.id);
                            }}
                          >
                            {isExpanded ? "Read less" : "Read more"}
                          </button>
                        ) : null}
                        {isExpanded && coach.achievements && coach.achievements.length > 0 ? (
                          <ul className="mt-4 space-y-1.5 text-xs text-gray-600">
                            {coach.achievements.map((achievement, achievementIndex) => (
                              <li key={`${coach.id}-${achievementIndex}`} className="flex items-start gap-2">
                                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-green-primary" />
                                <span>{achievement}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {isExpanded && coach.quote ? (
                          <p className="mt-4 text-xs italic leading-relaxed text-gray-500">&ldquo;{coach.quote}&rdquo;</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </ScrollAnimation>
              );
            })}
          </div>
        ) : (
          <ScrollAnimation direction="up" delay={200}>
            <div className="py-12 text-center">
              <p className="text-lg text-gray-600">No coaches found yet.</p>
            </div>
          </ScrollAnimation>
        )}
      </div>
    </section>
  );
}
