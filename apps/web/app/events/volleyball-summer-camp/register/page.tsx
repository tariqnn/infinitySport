import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { fetchEvents } from "../../../../lib/apiClient";
import { SummerCampRegistrationForm } from "../../../_components/SummerCampRegistrationForm";

export const metadata = {
  title: "Volleyball Summer Camp Registration | Infinity Sports",
};

export const dynamic = "force-dynamic";

const VOLLEYBALL_SUMMER_CAMP_PACKAGE_NAME = "Volleyball Summer Camp";

function isVolleyballSummerCamp(title: string) {
  const normalized = title.trim().toLowerCase();
  return normalized === "volleyball summer camp" || (normalized.includes("volleyball") && normalized.includes("summer camp"));
}

export default async function VolleyballSummerCampRegisterPage() {
  const events = await fetchEvents();
  const event = events.find((item) => isVolleyballSummerCamp(item.title));

  if (!event) {
    notFound();
  }

  const imageUrl = event.imageUrl || "/events.jpeg";
  const location = event.location || "Infinity Sports Academy";

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
              src={imageUrl}
              alt={event.title}
              className="absolute inset-0 h-full w-full object-cover opacity-55"
            />
            <div className="relative z-10 flex min-h-72 flex-col justify-end p-6 text-white sm:p-8 md:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/85 sm:text-sm">
                Registration
              </p>
              <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl md:text-5xl">
                {event.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-white/95 sm:text-lg">
                {event.description ||
                  "Quick registration with simple choices for medical notes, uniform size, transport, media consent, and emergency contact."}
              </p>
              <p className="mt-3 text-sm font-semibold text-white/90">{location}</p>
            </div>
          </div>

          <div className="mt-8">
            <SummerCampRegistrationForm
              packageName={VOLLEYBALL_SUMMER_CAMP_PACKAGE_NAME}
              campTitle={event.title}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
