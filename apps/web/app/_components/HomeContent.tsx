"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, PlayIcon } from "@heroicons/react/24/solid";
import { PlusIcon } from "@heroicons/react/24/outline";
import type { LandingContent } from "@infinity/types";
import { AnimatedText } from "./AnimatedText";
import { ScrollAnimation } from "./ScrollAnimation";

interface HomeContentProps {
  content: LandingContent;
}

const HERO_IMAGE = "/hero-basketball.jpg";
const HERO_VIDEO_FALLBACK = "https://www.youtube.com/watch?v=TOWEdazDzzE";
const HERO_VIDEO_START_SECONDS = 6; // start the clip at 0:06 as requested

export function HomeContent({ content }: HomeContentProps) {
  const hero = content.hero;
  const heroTitle = hero.title?.trim() || "Elevating Jordanian Athletes";
  const heroSubtitle =
    hero.subtitle?.trim() ||
    "Infinity Sports delivers elite training programs, professional coaching, and world-class facilities for teams and individuals across the region.";
  const primaryCta = {
    href: hero.primaryCtaLink || "/contact",
    label: hero.primaryCtaLabel || "Explore Programs"
  };
  const secondaryCta = hero.secondaryCtaLabel
    ? {
        href: hero.secondaryCtaLink || "/contact",
        label: hero.secondaryCtaLabel
      }
    : { href: "/contact", label: "Book a Tour" };

  const facilityHighlight = content.facilityHighlights[0];
  const showcaseFacilities = content.facilityHighlights.slice(0, 3);
  const sportHighlights = content.programs.slice(0, 4);
  const upcomingEvents = content.events.filter((event) => event.isActive !== false).slice(0, 3);
  const offerCards = content.offers;
  const valueProps = content.highlights;
  const announcements = content.announcements?.filter((announcement) => announcement.isActive !== false) ?? [];
  const footer = content.footer;
  const heroImage = hero.backgroundImageUrl || HERO_IMAGE;
  const heroVideoUrl = (hero.backgroundVideoUrl?.trim() || HERO_VIDEO_FALLBACK)?.trim();
  const heroVideoEmbed = (() => {
    if (!heroVideoUrl) return null;
    const url = heroVideoUrl;
    try {
      if (url.includes('youtube.com/watch')) {
        const parsed = new URL(url);
        const id = parsed.searchParams.get('v');
        if (id) {
          return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&modestbranding=1&showinfo=0&rel=0&start=${HERO_VIDEO_START_SECONDS}`;
        }
      }
      if (url.includes('youtube.com/embed')) {
        const separator = url.includes('?') ? '&' : '?';
        const idMatch = url.split('/').pop()?.split('?')[0];
        return `${url}${separator}autoplay=1&mute=1&controls=0&loop=1&playlist=${idMatch ?? ''}&modestbranding=1&showinfo=0&rel=0&start=${HERO_VIDEO_START_SECONDS}`;
      }
      return url;
    } catch {
      return null;
    }
  })();
  const featuredOffer = offerCards.find((offer) => offer.isFeatured) ?? offerCards[0];

  // Parallax effect for hero
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [contactStatus, setContactStatus] = useState<"idle" | "success" | "error">("idle");
  const [contactFeedback, setContactFeedback] = useState("");
  const [contactSubmitting, setContactSubmitting] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          setScrollY(window.scrollY * 0.3);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
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
      setContactFeedback(`Request sent. Our team will reply from ${result.submission.recipient}.`);
      setContactForm({ name: "", email: "", message: "" });
    } catch (error) {
      console.error("Contact request error", error);
      setContactStatus("error");
      setContactFeedback("Something went wrong. Please try again in a moment.");
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
          className="absolute inset-0"
          style={{ transform: `translateY(${scrollY * 0.3}px)` }}
        >
          {heroVideoEmbed ? (
            <iframe
              title="Infinity Sport hero background video"
              src={heroVideoEmbed}
              className="absolute inset-0 h-full w-full scale-125 object-cover"
              allow="autoplay; fullscreen; encrypted-media"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <Image
              src={heroImage}
              alt="Hero athlete"
              fill
              className="object-cover scale-110"
              priority
              unoptimized
            />
          )}
        </div>
        
        {/* Cinematic Gradient Overlay: Top-left BLUE → Bottom-right GREEN */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1426FF]/60 via-[#69FFDB]/30 to-[#61FF45]/60" />
        {/* Darkening overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/60" />
        {/* Subtle blur effect behind cards */}
        <div className="absolute inset-0 backdrop-blur-[2px]" />

        {/* Hero Content Container */}
        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-12 pt-24 sm:px-6 lg:px-8 lg:pt-32">
          <div className="flex flex-1 flex-col lg:flex-row lg:items-center lg:justify-between lg:gap-12">
            
            {/* Main Hero Content - Left Side */}
            <div className="flex flex-1 flex-col justify-center gap-6 text-left lg:max-w-3xl sm:gap-8">
              {/* Headline with fade-up animation */}
              <AnimatedText className="text-3xl font-black leading-[1.1] text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)] sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl tracking-tight">
                {heroTitle}
              </AnimatedText>
              
              {/* Subheading */}
              <AnimatedText delay={150} className="text-base text-white/95 max-w-2xl leading-relaxed font-medium sm:text-lg md:text-xl lg:text-2xl">
                {heroSubtitle}
              </AnimatedText>
              
              {/* CTA Buttons */}
              <AnimatedText delay={300} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <Link
                  href={primaryCta.href}
                  className="group inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-[#1426FF] via-[#69FFDB] to-[#61FF45] px-6 py-3.5 text-sm font-black text-white shadow-[0_8px_24px_rgba(20,38,255,0.4)] transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_32px_rgba(20,38,255,0.6),0_0_30px_rgba(97,255,69,0.4)] sm:w-auto sm:px-8 sm:py-4 sm:text-base md:px-10 md:py-5"
                >
                  {primaryCta.label || "Explore Programs"}
                  <ArrowRightIcon className="ml-2 h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  href={secondaryCta.href}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#1C934E] bg-transparent px-6 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-[#1C934E]/20 hover:border-[#61FF45] hover:shadow-[0_0_20px_rgba(28,147,78,0.5)] sm:w-auto sm:gap-3 sm:px-8 sm:py-4 sm:text-base md:px-10 md:py-5"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12 sm:h-10 sm:w-10">
                    <PlayIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </span>
                  {secondaryCta.label || "Book a Tour"}
                </Link>
              </AnimatedText>

              {announcements.length ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
                          Pinned
                        </span>
                      ) : null}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Glassmorphism Cards - Right Side (Desktop) / Below (Mobile) */}
            <div className="mt-8 flex flex-col gap-4 sm:mt-12 sm:gap-6 lg:mt-0 lg:max-w-md">
              
              {/* Facility Highlights Card - Floating Animation */}
              <ScrollAnimation direction="right" delay={400}>
                <div className="group relative rounded-2xl border border-white/30 bg-white/15 p-4 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition-all duration-500 hover:-translate-y-3 hover:shadow-[0_16px_48px_rgba(0,0,0,0.3)] animate-[float_6s_ease-in-out_infinite] sm:p-6 md:p-8">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-[#61FF45] font-black sm:text-xs">Facility Highlights</p>
                  <h3 className="mt-2 text-xl font-black text-white sm:mt-3 sm:text-2xl">
                    {facilityHighlight?.name || "Infinity Arena"}
                  </h3>
                  <p className="mt-2 text-xs text-white/90 leading-relaxed sm:text-sm">
                    {facilityHighlight?.description || "State Of The Hard Gym"}
                  </p>
                  <button
                    className="mt-4 inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#61FF45] bg-[#61FF45] text-white shadow-[0_4px_15px_rgba(97,255,69,0.5)] transition-all duration-300 hover:scale-110 hover:bg-[#69FFDB] hover:border-[#69FFDB] hover:shadow-[0_6px_20px_rgba(105,255,219,0.6)] hover:rotate-90 sm:mt-6 sm:h-12 sm:w-12"
                    aria-label="Discover facility highlights"
                  >
                    <PlusIcon className="h-4 w-4 transition-transform duration-300 sm:h-5 sm:w-5" />
                  </button>
                </div>
              </ScrollAnimation>

              {/* Quote Card */}
              <ScrollAnimation direction="right" delay={500}>
                <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.15)] transition-all duration-500 hover:-translate-y-2 hover:bg-white/15 hover:shadow-[0_12px_32px_rgba(0,0,0,0.2)] sm:p-6">
                  <p className="text-xs leading-relaxed italic text-white/95 sm:text-sm md:text-base">
                    &ldquo;Elite conditioning programs tailored for pros who demand results.&rdquo;
                  </p>
                </div>
              </ScrollAnimation>

              {/* Plan Details Card */}
              <ScrollAnimation direction="right" delay={600}>
                <div className="rounded-2xl border border-white/30 bg-white/15 p-4 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_16px_48px_rgba(0,0,0,0.3)] sm:p-6 md:p-8">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#69FFDB] font-black sm:text-xs sm:tracking-[0.4em]">
                    {featuredOffer?.badge || "Featured plan"}
                  </p>
                  <h4 className="mt-2 text-lg font-black text-white sm:mt-3 sm:text-xl">{featuredOffer?.name || "Elite Membership"}</h4>
                  <p className="mt-2 text-xs text-white/90 leading-relaxed sm:text-sm">
                    {featuredOffer?.description || "Monthly, yearly, and family memberships built for your routine."}
                  </p>
                  <ul className="mt-3 space-y-1.5 text-xs text-white/85 sm:mt-4 sm:space-y-2 sm:text-sm">
                    {(featuredOffer?.features || []).slice(0, 3).map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#61FF45]" />
                        <span className="line-clamp-1">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={featuredOffer?.link || "/offers"}
                    className="group mt-4 inline-flex w-full items-center justify-center rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-bold text-white transition-all duration-300 hover:scale-105 hover:bg-white/20 hover:border-white/50 sm:mt-6 sm:w-auto sm:px-6 sm:py-2.5 sm:text-sm"
                  >
                    Explore Offers
                    <ArrowRightIcon className="ml-2 h-3 w-3 transition-transform duration-300 group-hover:translate-x-1 sm:h-4 sm:w-4" />
                  </Link>
                </div>
              </ScrollAnimation>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Facilities Section */}
      <section id="facilities" className="bg-white py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimation direction="up">
            <div className="flex flex-col gap-3 sm:gap-4">
              <p className="text-xs uppercase tracking-[0.3em] text-brand-green-dark font-bold sm:text-sm">Facility Highlights</p>
              <h2 className="text-3xl font-black text-brand-black leading-tight sm:text-4xl md:text-5xl">Spaces engineered for high output</h2>
              <p className="max-w-2xl text-base text-gray-600 leading-relaxed sm:text-lg">
                Explore the Infinity campus: Olympic lifting bays, indoor turf, padel domes, and studio environments built for focus.
              </p>
            </div>
          </ScrollAnimation>
          <div className="mt-8 grid gap-6 sm:mt-12 sm:gap-8 md:grid-cols-2 lg:mt-16 lg:grid-cols-3">
            {showcaseFacilities.map((facility, index) => (
              <ScrollAnimation key={facility.id} direction="up" delay={index * 100}>
                <div className="group rounded-2xl border-2 border-brand-lightBlue/20 bg-white p-4 shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-3 hover:border-brand-green-primary/60 hover:shadow-[0_16px_48px_rgba(20,26,255,0.2),0_0_0_1px_rgba(96,208,102,0.1)] sm:p-6">
                  <div className="relative h-48 overflow-hidden rounded-xl sm:h-56">
                    <Image
                      src={facility.mediaUrl || heroImage}
                      alt={facility.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-[#141AFF]/30 via-[#6BA5E8]/20 to-[#60D066]/30 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  </div>
                  <div className="mt-6 space-y-3">
                    <h3 className="text-2xl font-black text-brand-black">{facility.name}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{facility.description}</p>
                    <Link href="/facilities" className="group/link inline-flex items-center gap-2 text-sm font-bold text-brand-blue-primary transition-colors duration-300 hover:text-brand-green-primary">
                      Tour facility
                      <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </ScrollAnimation>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Games Section with Gradient Background */}
      <section id="games" className="relative bg-gradient-to-br from-[#141AFF] via-[#6BA5E8] to-[#60D066] py-12 sm:py-16 md:py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimation direction="up">
            <div className="flex flex-col gap-3 sm:gap-4">
              <p className="text-xs uppercase tracking-[0.3em] text-white/90 font-bold sm:text-sm">Programs</p>
              <h2 className="text-3xl font-black text-white leading-tight sm:text-4xl md:text-5xl">Game-ready coaching</h2>
              <p className="max-w-2xl text-base text-white/95 leading-relaxed sm:text-lg">
                Basketball, padel, tennis, volleyball, and multi-sport conditioning with tournament-ready formats.
              </p>
            </div>
          </ScrollAnimation>
          <div className="mt-8 grid gap-4 sm:mt-12 sm:gap-6 md:grid-cols-2 lg:mt-16 lg:grid-cols-4">
            {sportHighlights.map((program, index) => (
              <ScrollAnimation key={program.id} direction="up" delay={index * 100}>
                <div className="group rounded-2xl border-2 border-white/30 bg-white/95 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.15)] backdrop-blur-sm transition-all duration-500 hover:-translate-y-3 hover:border-brand-blue-primary/60 hover:shadow-[0_16px_48px_rgba(20,26,255,0.3)] hover:scale-105 sm:p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.35em] text-brand-green-dark font-bold">
                      {program.sportType || "Program"}
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
                    Explore program
                    <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-1" />
                  </Link>
                </div>
              </ScrollAnimation>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Offers Section */}
      <section id="offers" className="bg-white py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimation direction="up">
            <div className="flex flex-col gap-3 sm:gap-4">
              <p className="text-xs uppercase tracking-[0.3em] text-brand-green-dark font-bold sm:text-sm">Membership</p>
              <h2 className="text-3xl font-black text-brand-black leading-tight sm:text-4xl md:text-5xl">Limited-time offers</h2>
              <p className="max-w-2xl text-base text-gray-600 leading-relaxed sm:text-lg">Slide into the plan that matches your grind.</p>
            </div>
          </ScrollAnimation>
          <div className="mt-8 grid gap-6 sm:mt-12 sm:gap-8 md:grid-cols-2 lg:mt-16 lg:grid-cols-3">
            {offerCards.map((offer, idx) => (
              <ScrollAnimation key={offer.id} direction="up" delay={idx * 100}>
                <div className="group flex h-full flex-col rounded-2xl border-2 border-brand-lightBlue/20 bg-white p-6 shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-3 hover:border-brand-green-primary/60 hover:shadow-[0_16px_48px_rgba(20,26,255,0.2),0_0_0_1px_rgba(96,208,102,0.1)] hover:scale-105 sm:p-8">
                  <div className="flex items-center justify-between text-sm">
                    {offer.badge ? (
                      <span className="rounded-full bg-gradient-button px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-white shadow-button">
                        {offer.badge}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="text-2xl font-black text-brand-black">{offer.price}</span>
                  </div>
                  <h3 className="mt-6 text-2xl font-black text-brand-black">{offer.name}</h3>
                  <p className="mt-3 text-sm text-gray-600 flex-1 leading-relaxed">{offer.description}</p>
                  <ul className="mt-4 space-y-2 text-sm text-gray-700">
                    {offer.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={offer.link || "/offers"}
                    className="group/link mt-6 inline-flex items-center gap-2 text-sm font-bold text-brand-blue-primary transition-colors duration-300 hover:text-brand-green-primary"
                  >
                    Get details
                    <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-1" />
                  </Link>
                </div>
              </ScrollAnimation>
            ))}
          </div>
        </div>
      </section>

      {/* Premium What We Offer Section */}
      <section id="services" className="bg-gray-50 py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimation direction="up">
            <div className="flex flex-col gap-3 sm:gap-4">
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
                    Learn more
                    <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-1" />
                  </Link>
                </div>
              </ScrollAnimation>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Events Section */}
      <section id="trainer" className="bg-white py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimation direction="up">
            <div className="flex flex-col gap-3 sm:gap-4">
              <p className="text-xs uppercase tracking-[0.3em] text-brand-green-dark font-bold sm:text-sm">Events & Highlights</p>
              <h2 className="text-3xl font-black text-brand-black leading-tight sm:text-4xl md:text-5xl">On the calendar</h2>
            </div>
          </ScrollAnimation>
          <div className="mt-8 grid gap-6 sm:mt-12 sm:gap-8 md:grid-cols-2 lg:mt-16 lg:grid-cols-3">
            {upcomingEvents.map((event, idx) => (
              <ScrollAnimation key={event.id} direction="up" delay={idx * 100}>
                <div className="rounded-2xl border-2 border-brand-lightBlue/20 bg-white p-6 shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-3 hover:border-brand-blue-primary/60 hover:shadow-[0_16px_48px_rgba(20,26,255,0.2)] hover:scale-105 sm:p-8">
                  <p className="text-xs uppercase tracking-[0.35em] text-brand-green-dark font-bold">
                    {new Date(event.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                  <h3 className="mt-4 text-2xl font-black text-brand-black">{event.title}</h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">{event.location ?? "Infinity Campus"}</p>
                  <Link href={event.link || "/events"} className="group/link mt-6 inline-flex items-center gap-2 text-sm font-bold text-brand-blue-primary transition-colors duration-300 hover:text-brand-green-primary">
                    View details
                    <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-1" />
                  </Link>
                </div>
              </ScrollAnimation>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Contact CTA Section with Gradient */}
      <section id="contact" className="relative bg-gradient-to-br from-[#141AFF] via-[#6BA5E8] to-[#60D066] py-12 sm:py-16 md:py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 text-center sm:gap-6 sm:px-6">
          <ScrollAnimation direction="up">
            <h2 className="text-3xl font-black text-white leading-tight sm:text-4xl md:text-5xl">Ready to elevate your team?</h2>
            <p className="text-white/95 text-base leading-relaxed max-w-2xl sm:text-lg md:text-xl">
              Book a campus tour, drop into a performance session, or request a corporate activation brief.
            </p>
          </ScrollAnimation>
          <ScrollAnimation direction="up" delay={100}>
            <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-5">
              <Link
                href="/contact"
                className="group inline-flex w-full items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-black shadow-[0_8px_24px_rgba(20,26,255,0.35)] transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_32px_rgba(20,26,255,0.5),0_0_24px_rgba(96,208,102,0.3)] sm:w-auto sm:px-10 sm:py-4 sm:text-base"
              >
                Book a Tour
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
                  <label className="text-sm font-bold text-brand-black">Full Name</label>
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
                  <label className="text-sm font-bold text-brand-black">Email</label>
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
                  <label className="text-sm font-bold text-brand-black">Message</label>
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
                className="group mt-6 w-full rounded-xl bg-gradient-button px-6 py-3.5 text-sm font-black text-white shadow-[0_8px_24px_rgba(20,26,255,0.35)] transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_32px_rgba(20,26,255,0.5),0_0_24px_rgba(96,208,102,0.3)] disabled:opacity-70 sm:mt-8 sm:px-8 sm:py-4 sm:text-base"
                disabled={contactSubmitting}
              >
                {contactSubmitting ? "Sending..." : "Send Request"}
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
