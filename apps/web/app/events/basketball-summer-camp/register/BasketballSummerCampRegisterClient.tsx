"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import {
  BASKETBALL_SUMMER_CAMP_PACKAGE_NAME,
  SummerCampRegistrationForm,
  SUMMER_CAMP_OPTIONS,
  WARRIORS_ASSISTANT_COACH_CAMP_PACKAGE_NAME,
  getSummerCampOption,
  type SummerCampOption,
} from "../../../_components/SummerCampRegistrationForm";

type Props = {
  eventTitle: string;
  eventDescription?: string;
  eventImageUrl: string;
  location: string;
  initialPackageName?: string;
  campOptions?: readonly SummerCampOption[];
};

const BASKETBALL_PAGE_CAMP_OPTIONS = SUMMER_CAMP_OPTIONS.filter((option) =>
  [BASKETBALL_SUMMER_CAMP_PACKAGE_NAME, WARRIORS_ASSISTANT_COACH_CAMP_PACKAGE_NAME].includes(option.packageName),
);

export function BasketballSummerCampRegisterClient({
  eventTitle,
  eventDescription,
  eventImageUrl,
  location,
  initialPackageName = BASKETBALL_SUMMER_CAMP_PACKAGE_NAME,
  campOptions = BASKETBALL_PAGE_CAMP_OPTIONS,
}: Props) {
  const [selectedPackageName, setSelectedPackageName] = useState(initialPackageName);
  const selectedCamp = getSummerCampOption(selectedPackageName);
  const isDefaultCamp = selectedCamp.packageName === BASKETBALL_SUMMER_CAMP_PACKAGE_NAME;
  const heroImageUrl = isDefaultCamp ? eventImageUrl : selectedCamp.heroImageUrl;
  const heroTitle = isDefaultCamp ? eventTitle : selectedCamp.label;
  const heroDescription = useMemo(() => {
    if (!isDefaultCamp) return selectedCamp.description;
    return (
      eventDescription ||
      "Quick registration with simple choices for medical notes, uniform size, transport, media consent, and emergency contact."
    );
  }, [eventDescription, isDefaultCamp, selectedCamp.description]);

  return (
    <div className="bg-gray-50 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-sm font-bold text-brand-blue-primary transition hover:text-brand-green-primary"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to events
        </Link>

        <div className="mt-8">
          <div className="relative min-h-72 overflow-hidden rounded-2xl border-2 border-brand-lightBlue/20 bg-[#003DA5] shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImageUrl}
              alt={heroTitle}
              className="absolute inset-0 h-full w-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/20" />
            <div className="relative z-10 flex min-h-72 flex-col justify-end p-6 text-white sm:p-8 md:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/85 sm:text-sm">
                Registration
              </p>
              <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl md:text-5xl">
                {heroTitle}
              </h1>
              {heroDescription ? (
                <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-white/95 sm:text-lg">
                  {heroDescription}
                </p>
              ) : null}
              <p className="mt-3 text-sm font-semibold text-white/90">{location}</p>
            </div>
          </div>

          <div className="mt-8">
            <SummerCampRegistrationForm
              packageName={BASKETBALL_SUMMER_CAMP_PACKAGE_NAME}
              campTitle={heroTitle}
              campOptions={campOptions}
              selectedPackageName={selectedPackageName}
              onCampChange={(option) => setSelectedPackageName(option.packageName)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
