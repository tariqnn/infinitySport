"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, PlayIcon } from "@heroicons/react/24/solid";
import type { LandingContent } from "@infinity/types";
import { AnimatedText } from "./AnimatedText";
import { ScrollAnimation } from "./ScrollAnimation";
import { useLanguage } from "./LanguageProvider";
import { tr } from "../../lib/translations";
import { BookingForm } from "../booking/BookingForm";

interface HomeContentProps {
  content: LandingContent;
}

const HERO_VIDEO_FALLBACK_PATH = "/main-video.mp4"; // Fallback video path (MP4 for browser compatibility)
const HERO_FALLBACK_IMAGE = "/hero-basketball.jpg"; // Fallback image if video fails

// Coach data structure
export function HomeContent({ content }: HomeContentProps) {
  const { language } = useLanguage();
  const hero = content.hero;
  const heroTitle = hero.title?.trim() || "Infinity Sport – Learn, Adapt, Evolve";
  const heroSubtitle =
    hero.subtitle?.trim() ||
    "Infinity features a modern sports facility designed for both leisure and competitive environments. It's a place where athletes and parents can watch kids learn, adapt, and evolve into modern-day players. Learn, adapt, and evolve with cutting-edge innovation focused on youth development and high-performance training.";
  const heroVideoPath = hero.backgroundVideoUrl?.trim() || HERO_VIDEO_FALLBACK_PATH;
  const primaryCta = {
    href: hero.primaryCtaLink || "/sports",
    label: hero.primaryCtaLabel || "Explore Programs"
  };
  const secondaryCta = hero.secondaryCtaLabel
    ? {
        href: hero.secondaryCtaLink || "/contact",
        label: hero.secondaryCtaLabel
      }
    : { href: "/contact", label: "Book a Tour" };

  const sportHighlights = content.programs.slice(0, 4);
  const upcomingEvents = content.events.filter((event) => event.isActive !== false).slice(0, 3);
  const valueProps = content.highlights;
  const announcements = content.announcements?.filter((announcement) => announcement.isActive !== false) ?? [];
  const footer = content.footer;

  // Parallax effect for hero
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [contactStatus, setContactStatus] = useState<"idle" | "success" | "error">("idle");
  const [contactFeedback, setContactFeedback] = useState("");
  const [contactSubmitting, setContactSubmitting] = useState(false);

  // Reset video state when component mounts (when navigating back to page)
  useEffect(() => {
    setVideoError(false);
    // Optimize video loading - only load when in viewport
    const video = videoRef.current;
    if (video) {
      // Use intersection observer to load video only when visible
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              video.load();
              video.play().catch(() => {
                // Autoplay can be blocked, will retry on canplay
              });
            } else {
              // Pause video when not visible to save resources
              video.pause();
            }
          });
        },
        { threshold: 0.1 }
      );
      
      observer.observe(video);
      
      return () => {
        observer.disconnect();
      };
    }
  }, []);

  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (heroRef.current) {
            const rect = heroRef.current.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
              setScrollY(window.scrollY * 0.3);
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleContactChange = (field: "name" | "email" | "message") => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setContactForm((prev) => ({ ...prev, [field]: event.target.value }));
    if (contactStatus !== "idle") {
      setContactStatus("idle");
      setContactFeedback("");
    }
  };

  const handleContactSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (contactSubmitting) return;
    setContactSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm)
      });

      if (!response.ok) {
        throw new Error("Failed to submit form");
      }

      const result = await response.json();
      setContactStatus("success");
      setContactFeedback(`${tr(language, 'home_contact_success')} ${result.submission.recipient}.`);
      setContactForm({ name: "", email: "", message: "" });
    } catch (error) {
      console.error("Contact request error", error);
      setContactStatus("error");
      setContactFeedback(tr(language, 'home_contact_error'));
    } finally {
      setContactSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-white">
      {/* CINEMATIC HERO SECTION - Premium Redesign */}
      <section id="home" ref={heroRef} className="relative isolate min-h-screen overflow-hidden">
        {/* Background Media */}
        <div
          className="absolute inset-0 z-0"
          style={{ 
            transform: `translateY(${scrollY * 0.3}px)`,
            willChange: 'transform',
            backfaceVisibility: 'hidden'
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={hero.backgroundImageUrl || HERO_FALLBACK_IMAGE}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ 
              objectFit: 'cover',
              width: '100%',
              height: '100%',
              minWidth: '100%',
              minHeight: '100%',
              display: videoError ? 'none' : 'block'
            }}
            onLoadedData={(e) => {
              // Ensure video plays after loading
              const video = e.currentTarget;
              video.play().catch((error) => {
                if (process.env.NODE_ENV !== "production") {
                  console.log("Hero video play failed (will retry):", error);
                }
                // Retry after a short delay
                setTimeout(() => {
                  video.play().catch(() => {
                    // Only set error if it truly fails after retry
                    if (process.env.NODE_ENV !== "production") {
                      console.warn("Hero video failed to play after retry");
                    }
                    setVideoError(true);
                  });
                }, 500);
              });
            }}
            onCanPlay={(e) => {
              // Try to play when video can play
              const video = e.currentTarget;
              if (video.paused) {
                video.play().catch(() => {
                  // Silent fail, will try again
                });
              }
            }}
            onError={(e) => {
              // Some browsers (or codecs) fail to decode; keep logs quiet for users.
              if (process.env.NODE_ENV !== "production") {
                const el = e.currentTarget;
                console.warn("Hero video error", {
                  src: el.currentSrc,
                  networkState: el.networkState,
                  readyState: el.readyState,
                  errorCode: el.error?.code,
                  errorMessage: el.error?.message
                });
              }
              // Only set error after a delay to allow for retries
              setTimeout(() => {
                setVideoError(true);
              }, 2000);
            }}
          >
            <source src={heroVideoPath} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          {videoError && (
            <Image
              src={HERO_FALLBACK_IMAGE}
              alt="Hero background"
              fill
              className="absolute inset-0 object-cover"
              priority
              sizes="100vw"
            />
          )}
        </div>

        {/* Hero Content Container */}
        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-12 pt-24 sm:px-6 lg:px-8 lg:pt-32">
          <div className="flex flex-1 flex-col items-center justify-center text-center lg:gap-12">
            
            {/* Main Hero Content - Left Side */}
            <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center lg:max-w-4xl sm:gap-8">
              {/* Headline with fade-up animation */}
              <AnimatedText className="text-3xl font-black leading-[1.1] text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)] sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl tracking-tight">
                {heroTitle}
              </AnimatedText>
              
              {/* Tagline */}
              <AnimatedText delay={100} className="text-sm text-white/90 max-w-2xl leading-relaxed font-semibold uppercase tracking-[0.2em] sm:text-base md:text-lg">
                {tr(language, 'home_tagline')}
              </AnimatedText>
              
              {/* Subheading */}
              <AnimatedText delay={150} className="text-base text-white/95 max-w-3xl leading-relaxed font-medium sm:text-lg md:text-xl lg:text-2xl">
                {heroSubtitle}
              </AnimatedText>
              
              {/* CTA Buttons */}
              <AnimatedText delay={300} className="flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <Link
                  href={primaryCta.href}
                  className="group inline-flex w-full items-center justify-center rounded-full bg-[#003DA5] px-6 py-3.5 text-sm font-black text-white shadow-[0_8px_24px_rgba(0,61,165,0.4)] transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_32px_rgba(0,61,165,0.6)] hover:bg-[#003DA5]/90 sm:w-auto sm:px-8 sm:py-4 sm:text-base md:px-10 md:py-5"
                >
                  {primaryCta.label || tr(language, 'home_explore_programs')}
                  <ArrowRightIcon className="ml-2 h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  href={secondaryCta.href}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#003DA5] bg-transparent px-6 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-[#003DA5]/20 hover:border-[#003DA5] hover:shadow-[0_0_20px_rgba(0,61,165,0.5)] sm:w-auto sm:gap-3 sm:px-8 sm:py-4 sm:text-base md:px-10 md:py-5"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12 sm:h-10 sm:w-10">
                    <PlayIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </span>
                  {secondaryCta.label || tr(language, 'home_book_tour')}
                </Link>
              </AnimatedText>

              {announcements.length ? (
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
                  {announcements.slice(0, 2).map((announcement) => (
                    <Link
                      key={announcement.id}
                      href={announcement.link || "/contact"}
                      className="inline-flex w-full items-center justify-between rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-xs text-white backdrop-blur-sm transition hover:border-white/40 sm:min-w-[220px] sm:flex-1 sm:text-sm"
                    >
                      <div className="max-w-xs flex-1 pr-2">
                        <p className="font-semibold truncate">{announcement.title}</p>
                        <p className="text-white/80 text-[10px] sm:text-xs line-clamp-1">{announcement.message}</p>
                      </div>
                      {announcement.isPinned ? (
                        <span className="flex-shrink-0 rounded-full bg-[#61FF45]/20 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[#61FF45] sm:px-3 sm:text-[10px]">
                          {tr(language, 'home_pinned')}
                        </span>
                      ) : null}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            {/* (removed) Glassmorphism Cards */}
          </div>
        </div>
      </section>

      {/* Who We Are Section */}
      <section id="who-we-are" className="bg-white py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimation direction="up">
            <div className="flex flex-col gap-3 sm:gap-4 text-center mb-12">
              <p className="text-xs uppercase tracking-[0.3em] text-brand-green-dark font-bold sm:text-sm">{tr(language, 'home_about_us')}</p>
              <h2 className="text-3xl font-black text-brand-black leading-tight sm:text-4xl md:text-5xl">{tr(language, 'home_who_we_are')}</h2>
            </div>
          </ScrollAnimation>
          <div className="max-w-4xl mx-auto">
            <ScrollAnimation direction="up" delay={100}>
              <div className="rounded-2xl border-2 border-brand-lightBlue/20 bg-white p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)] sm:p-12">
                <p className="text-base text-gray-600 leading-relaxed sm:text-lg md:text-xl">
                  {tr(language, 'home_about_desc')}
                </p>
                <p className="mt-6 text-base text-gray-600 leading-relaxed sm:text-lg md:text-xl">
                  {tr(language, 'home_about_desc2')}
                </p>
              </div>
            </ScrollAnimation>
          </div>
        </div>
      </section>

      {/* Premium Facilities Section */}
      <section id="facilities" className="bg-white py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link href="/facilities" className="block cursor-pointer group">
            <ScrollAnimation direction="up">
              <div className="flex flex-col gap-3 text-center sm:gap-4">
                <p className="text-xs uppercase tracking-[0.3em] text-brand-green-dark font-bold sm:text-sm">{tr(language, 'home_facility_highlights')}</p>
                <h2 className="text-3xl font-black text-brand-black leading-tight sm:text-4xl md:text-5xl group-hover:text-brand-green-primary transition-colors">{tr(language, 'home_our_facilities')}</h2>
                <p className="max-w-2xl mx-auto text-base text-gray-600 leading-relaxed sm:text-lg">
                  {tr(language, 'home_facilities_desc')}
                </p>
                {content.facilityHighlights.length > 0 ? (
                  <ul className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                    {content.facilityHighlights.map((f) => (
                      <li key={f.id} className="rounded-full border border-brand-lightBlue/40 bg-white px-4 py-2 text-sm font-semibold text-brand-black shadow-sm transition-all group-hover:border-brand-green-primary/50">
                        {f.name}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-6 flex items-center justify-center gap-2 text-brand-green-primary font-semibold group-hover:gap-4 transition-all">
                  <span>{tr(language, 'home_view_all_facilities')}</span>
                  <ArrowRightIcon className="w-5 h-5" />
                </div>
              </div>
            </ScrollAnimation>
          </Link>
        </div>
      </section>


      {/* Basketball Programs & Pricing Section */}
      <section id="basketball-programs" className="bg-white py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link href="/sports" className="block">
            <ScrollAnimation direction="up">
              <div className="flex flex-col gap-3 sm:gap-4 text-center cursor-pointer group">
                <p className="text-xs uppercase tracking-[0.3em] text-brand-green-dark font-bold sm:text-sm">{tr(language, 'home_programs')}</p>
                <h2 className="text-3xl font-black text-brand-black leading-tight sm:text-4xl md:text-5xl group-hover:text-brand-green-primary transition-colors">{tr(language, 'home_basketball_programs')}</h2>
                <p className="text-base font-semibold text-brand-green-primary">Infinity Sports Basketball Academy</p>
                <p className="max-w-2xl mx-auto text-base text-gray-600 leading-relaxed sm:text-lg">
                  {tr(language, 'home_programs_desc')}
                </p>
                <div className="mt-6 flex items-center justify-center gap-2 text-brand-green-primary font-semibold group-hover:gap-4 transition-all">
                  <span>{tr(language, 'home_view_all_programs')}</span>
                  <ArrowRightIcon className="w-5 h-5" />
                </div>
              </div>
            </ScrollAnimation>
          </Link>
        </div>
      </section>

      {/* Gymnastics Programs Section */}
      <section id="gymnastics-packages" className="bg-gray-50 py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link href="/sports" className="block">
            <ScrollAnimation direction="up">
              <div className="flex flex-col gap-3 sm:gap-4 text-center cursor-pointer group">
                <p className="text-xs uppercase tracking-[0.3em] text-brand-green-dark font-bold sm:text-sm">{tr(language, 'home_packages')}</p>
                <h2 className="text-3xl font-black text-brand-black leading-tight sm:text-4xl md:text-5xl group-hover:text-brand-green-primary transition-colors">{tr(language, 'home_gymnastics_programs')}</h2>
                <p className="text-base font-semibold text-brand-green-primary">Powered by Phoenix Academy</p>
                <p className="max-w-2xl mx-auto text-base text-gray-600 leading-relaxed sm:text-lg">
                  {tr(language, 'home_gymnastics_programs_desc')}
                </p>
                <div className="mt-6 flex items-center justify-center gap-2 text-brand-green-primary font-semibold group-hover:gap-4 transition-all">
                  <span>View All Packages</span>
                  <ArrowRightIcon className="w-5 h-5" />
                </div>
              </div>
            </ScrollAnimation>
          </Link>
        </div>
      </section>

      {/* Volleyball Section */}
      <section id="volleyball" className="bg-white py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link href="/sports#volleyball" className="block">
            <ScrollAnimation direction="up">
              <div className="flex flex-col gap-3 sm:gap-4 text-center cursor-pointer group">
                <p className="text-xs uppercase tracking-[0.3em] text-brand-green-dark font-bold sm:text-sm">{tr(language, 'home_packages')}</p>
                <h2 className="text-3xl font-black text-brand-black leading-tight sm:text-4xl md:text-5xl group-hover:text-brand-green-primary transition-colors">{tr(language, 'home_volleyball')}</h2>
                <p className="text-base font-semibold text-brand-green-primary">Powered by Spikers Academy</p>
                <p className="max-w-2xl mx-auto text-base text-gray-600 leading-relaxed sm:text-lg">
                  {tr(language, 'home_volleyball_desc')}
                </p>
                <p className="text-sm text-gray-500">Sat 3–5 PM • Tue & Sun 7–9 PM</p>
                <div className="mt-6 flex items-center justify-center gap-2 text-brand-green-primary font-semibold group-hover:gap-4 transition-all">
                  <span>View Details</span>
                  <ArrowRightIcon className="w-5 h-5" />
                </div>
              </div>
            </ScrollAnimation>
          </Link>
        </div>
      </section>

      {/* Premium Games Section with Gradient Background */}
      <section id="games" className="relative bg-[#003DA5] py-12 sm:py-16 md:py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimation direction="up">
            <div className="flex flex-col gap-3 sm:gap-4 text-center mx-auto">
              <h2 className="text-3xl font-black text-white leading-tight sm:text-4xl md:text-5xl">{tr(language, 'home_game_ready')}</h2>
              <p className="max-w-2xl mx-auto text-base text-white/95 leading-relaxed sm:text-lg">
                {tr(language, 'home_game_ready_desc')}
              </p>
            </div>
          </ScrollAnimation>
          <div className="mt-8 grid gap-4 sm:mt-12 sm:gap-6 md:grid-cols-2 lg:mt-16 lg:grid-cols-4">
            {sportHighlights.map((program, index) => (
              <ScrollAnimation key={program.id} direction="up" delay={index * 100}>
                <div className="group rounded-2xl border-2 border-white/30 bg-white/95 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.15)] backdrop-blur-sm transition-all duration-500 hover:-translate-y-3 hover:border-brand-blue-primary/60 hover:shadow-[0_16px_48px_rgba(20,26,255,0.3)] hover:scale-105 sm:p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.35em] text-brand-green-dark font-bold">
                      {(program.sportType || "Program").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </p>
                    {program.badge ? (
                      <span className="rounded-full bg-white/30 px-3 py-1 text-[11px] font-semibold text-brand-blue-primary">
                        {program.badge}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 text-xl font-black text-brand-black">{program.title}</h3>
                  <p className="mt-2 text-sm text-gray-600 line-clamp-3 leading-relaxed">{program.description}</p>
                  <Link
                    href={program.link || "/sports"}
                    className="group/link mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-blue-primary transition-colors duration-300 hover:text-brand-green-primary"
                  >
                    {tr(language, 'home_explore_program')}
                    <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-1" />
                  </Link>
                </div>
              </ScrollAnimation>
            ))}
          </div>
        </div>
      </section>

      {/* (removed) Membership / Limited-time offers section */}

      {/* Booking Section – full form with court, date, duration (1h / 1.5h / 2h), time */}
      <section id="booking" className="bg-gray-50 py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimation direction="up">
            <div className="flex flex-col gap-3 sm:gap-4 text-center mb-12">
              <p className="text-xs uppercase tracking-[0.3em] text-brand-green-dark font-bold sm:text-sm">Reservations</p>
              <h2 className="text-3xl font-black text-brand-black leading-tight sm:text-4xl md:text-5xl">{tr(language, 'home_book_session')}</h2>
              <p className="max-w-2xl mx-auto text-base text-gray-600 leading-relaxed sm:text-lg">
                Reserve your court, training session, or facility space today.
              </p>
            </div>
          </ScrollAnimation>
          <div className="max-w-3xl mx-auto">
            <div className="rounded-2xl border-2 border-brand-lightBlue/20 bg-white p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)] sm:p-12">
              <BookingForm />
            </div>
          </div>
        </div>
      </section>

      {/* Premium What We Offer Section */}
      <section id="services" className="bg-gray-50 py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimation direction="up">
            <div className="flex flex-col items-center gap-3 text-center sm:gap-4">
              <p className="text-xs uppercase tracking-[0.3em] text-brand-green-dark font-bold sm:text-sm">What we offer</p>
              <h2 className="text-3xl font-black text-brand-black leading-tight sm:text-4xl md:text-5xl">Beyond training sessions</h2>
            </div>
          </ScrollAnimation>
          <div className="mt-8 grid gap-6 sm:mt-12 sm:gap-8 md:grid-cols-2 lg:mt-16 lg:grid-cols-3">
            {valueProps.map((value, idx) => (
              <ScrollAnimation key={value.id || value.title} direction="up" delay={idx * 100}>
                <div className="rounded-2xl border-2 border-brand-lightBlue/20 bg-white p-6 shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-3 hover:border-brand-green-primary/60 hover:shadow-[0_16px_48px_rgba(20,26,255,0.2)] hover:scale-105 sm:p-8">
                  <p className="text-xs uppercase tracking-[0.35em] text-brand-green-dark font-bold">
                    {value.icon || "Highlight"}
                  </p>
                  <h3 className="text-2xl font-black text-brand-black">{value.title}</h3>
                  <p className="mt-4 text-sm text-gray-600 leading-relaxed">{value.description}</p>
                  <Link href="/offerings" className="group/link mt-6 inline-flex items-center gap-2 text-sm font-bold text-brand-blue-primary transition-colors duration-300 hover:text-brand-green-primary">
                    {tr(language, 'home_learn_more')}
                    <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-1" />
                  </Link>
                </div>
              </ScrollAnimation>
            ))}
          </div>
        </div>
      </section>

      {/* Coming Events Section */}
      <section id="events" className="bg-white py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimation direction="up">
            <div className="flex flex-col items-center gap-3 text-center sm:gap-4">
              <p className="text-xs uppercase tracking-[0.3em] text-brand-green-dark font-bold sm:text-sm">Events</p>
              <h2 className="text-3xl font-black text-brand-black leading-tight sm:text-4xl md:text-5xl">{tr(language, 'home_coming_events')}</h2>
            </div>
          </ScrollAnimation>
          
          {/* Featured Event Image */}
          <ScrollAnimation direction="up" delay={50}>
            <div className="mt-8 sm:mt-12 lg:mt-16">
              <div className="group relative overflow-hidden rounded-2xl border-2 border-brand-lightBlue/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-2 hover:border-brand-green-primary/60 hover:shadow-[0_16px_48px_rgba(20,26,255,0.2)]">
                <div className="relative h-64 sm:h-80 md:h-96 lg:h-[500px] w-full">
                  <Image
                    src="/events.jpeg"
                    alt="Upcoming Event"
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 100vw, 1280px"
                    priority
                  />
                </div>
              </div>
              <div className="mx-auto mt-5 flex max-w-3xl flex-col items-center gap-3 text-center">
                <p className="text-xs uppercase tracking-[0.35em] text-brand-green-dark font-bold">Upcoming Event</p>
                <h3 className="text-2xl font-black text-brand-black sm:text-3xl">See what&apos;s next at Infinity</h3>
                <Link
                  href="/events"
                  className="group/link inline-flex items-center gap-2 text-sm font-bold text-white bg-[#003DA5] px-5 py-2.5 rounded-full shadow-button transition-all duration-300 hover:shadow-button-hover hover:bg-[#003DA5]/90 hover:gap-3"
                >
                  View Event Details
                  <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>
          </ScrollAnimation>

          <div className="mt-8 grid gap-6 sm:mt-12 sm:gap-8 md:grid-cols-2 lg:mt-16 lg:grid-cols-3">
            {upcomingEvents.map((event, idx) => (
              <ScrollAnimation key={event.id} direction="up" delay={(idx + 1) * 100}>
                <Link href="/events" className="block">
                  <div className="group rounded-2xl border-2 border-brand-lightBlue/20 bg-white p-6 shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-3 hover:border-brand-green-primary/60 hover:shadow-[0_16px_48px_rgba(20,26,255,0.2)] hover:scale-105 sm:p-8">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs uppercase tracking-[0.35em] text-brand-green-dark font-bold">
                        {new Date(event.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </p>
                      <span className="rounded-full bg-[#003DA5]/10 px-3 py-1 text-xs font-semibold text-[#003DA5]">
                        Upcoming
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-brand-black group-hover:text-brand-green-primary transition-colors">{event.title}</h3>
                    <p className="mt-2 text-sm text-gray-600 leading-relaxed flex items-center gap-2">
                      <svg className="h-4 w-4 text-brand-green-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {event.location ?? "Infinity Campus"}
                    </p>
                    <div className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-brand-blue-primary transition-colors duration-300 group-hover:text-brand-green-primary">
                      View Event Details
                      <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              </ScrollAnimation>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Contact CTA Section with Gradient */}
      <section id="contact" className="relative bg-[#003DA5] py-12 sm:py-16 md:py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 text-center sm:gap-6 sm:px-6">
          <ScrollAnimation direction="up">
            <h2 className="text-3xl font-black text-white leading-tight sm:text-4xl md:text-5xl">{tr(language, 'home_ready_elevate')}</h2>
            <p className="text-white/95 text-base leading-relaxed max-w-2xl sm:text-lg md:text-xl">
              {tr(language, 'home_ready_desc')}
            </p>
          </ScrollAnimation>
          <ScrollAnimation direction="up" delay={100}>
            <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-5">
              <Link
                href="/contact"
                className="group inline-flex w-full items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-black shadow-[0_8px_24px_rgba(20,26,255,0.35)] transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_32px_rgba(20,26,255,0.5),0_0_24px_rgba(96,208,102,0.3)] sm:w-auto sm:px-10 sm:py-4 sm:text-base"
              >
                {tr(language, 'home_book_tour')}
                <ArrowRightIcon className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 sm:h-5 sm:w-5" />
              </Link>
              <Link
                href="/offers"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-white/90 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white/25 hover:border-white hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] sm:w-auto sm:gap-3 sm:px-10 sm:py-4 sm:text-base"
              >
                Explore Programs
                <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 sm:h-5 sm:w-5" />
              </Link>
            </div>
          </ScrollAnimation>
          {footer ? (
            <ScrollAnimation direction="up" delay={150}>
              <div className="grid w-full gap-4 rounded-2xl border border-white/30 bg-white/10 p-4 text-left text-white backdrop-blur-md sm:grid-cols-3 sm:p-6">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/70 sm:text-xs sm:tracking-[0.35em]">Address</p>
                  <p className="mt-1.5 text-xs font-semibold sm:mt-2 sm:text-sm">{footer.address}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/70 sm:text-xs sm:tracking-[0.35em]">Phone</p>
                  <p className="mt-1.5 text-xs font-semibold sm:mt-2 sm:text-sm">{footer.phone}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/70 sm:text-xs sm:tracking-[0.35em]">Email</p>
                  <p className="mt-1.5 text-xs font-semibold break-all sm:mt-2 sm:text-sm">{footer.email}</p>
                </div>
              </div>
            </ScrollAnimation>
          ) : null}
        </div>
        
        {/* Premium Contact Form */}
        <ScrollAnimation direction="up" delay={200}>
          <div className="relative mx-auto mt-8 w-full max-w-3xl px-4 sm:mt-12 sm:px-6 md:mt-16">
            <form
              className="rounded-2xl border-2 border-white/40 bg-white/95 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.15)] backdrop-blur-xl sm:p-8 md:p-10"
              onSubmit={handleContactSubmit}
            >
              <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                <div className="text-left">
                  <label className="text-sm font-bold text-brand-black">{tr(language, 'home_contact_name')}</label>
                  <input
                    type="text"
                    className="mt-2 w-full rounded-xl border-2 border-brand-lightBlue bg-white px-5 py-4 text-brand-black placeholder-gray-400 transition-all duration-300 focus:border-brand-blue-primary focus:outline-none focus:ring-4 focus:ring-brand-blue-primary/20 hover:border-brand-blue-primary/60"
                    placeholder="Jordan Athlete"
                    value={contactForm.name}
                    onChange={handleContactChange("name")}
                    required
                  />
                </div>
                <div className="text-left">
                  <label className="text-sm font-bold text-brand-black">{tr(language, 'home_contact_email')}</label>
                  <input
                    type="email"
                    className="mt-2 w-full rounded-xl border-2 border-brand-lightBlue bg-white px-5 py-4 text-brand-black placeholder-gray-400 transition-all duration-300 focus:border-brand-blue-primary focus:outline-none focus:ring-4 focus:ring-brand-blue-primary/20 hover:border-brand-blue-primary/60"
                    placeholder="you@infinitysport.jo"
                    value={contactForm.email}
                    onChange={handleContactChange("email")}
                    required
                  />
                </div>
                <div className="text-left md:col-span-2">
                  <label className="text-sm font-bold text-brand-black">{tr(language, 'home_contact_message')}</label>
                  <textarea
                    rows={5}
                    className="mt-2 w-full rounded-xl border-2 border-brand-lightBlue bg-white px-5 py-4 text-brand-black placeholder-gray-400 transition-all duration-300 focus:border-brand-blue-primary focus:outline-none focus:ring-4 focus:ring-brand-blue-primary/20 hover:border-brand-blue-primary/60"
                    placeholder="Tell us about your team, facility needs, or preferred program."
                    value={contactForm.message}
                    onChange={handleContactChange("message")}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="group mt-6 w-full rounded-xl bg-[#003DA5] px-6 py-3.5 text-sm font-black text-white shadow-[0_8px_24px_rgba(0,61,165,0.35)] transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_32px_rgba(0,61,165,0.5)] hover:bg-[#003DA5]/90 disabled:opacity-70 sm:mt-8 sm:px-8 sm:py-4 sm:text-base"
                disabled={contactSubmitting}
              >
                {contactSubmitting ? tr(language, 'home_contact_sending') : tr(language, 'home_contact_send')}
                <ArrowRightIcon className="ml-2 inline h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 sm:h-5 sm:w-5" />
              </button>
              {contactFeedback ? (
                <p
                  className={`mt-4 text-sm font-semibold ${
                    contactStatus === "success" ? "text-brand-green-dark" : "text-red-500"
                  }`}
                >
                  {contactFeedback}
                </p>
              ) : null}
            </form>
            {footer?.socialLinks?.length ? (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-white">
                {footer.socialLinks.map((social) => (
                  <Link
                    key={social.id}
                    href={social.href}
                    className="rounded-full border border-white/40 px-4 py-2 text-sm font-semibold transition hover:border-white hover:bg-white/10"
                  >
                    {social.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </ScrollAnimation>
      </section>
    </div>
  );
}
