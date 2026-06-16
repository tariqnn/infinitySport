import { notFound } from "next/navigation";
import { fetchEvents } from "../../../../lib/apiClient";
import { BasketballSummerCampRegisterClient } from "./BasketballSummerCampRegisterClient";

export const metadata = {
  title: "Basketball Summer Camp Registration | Infinity Sports",
};

export const dynamic = "force-dynamic";

function isBasketballSummerCamp(title: string) {
  const normalized = title.trim().toLowerCase();
  return normalized === "basketball summer camp" || (normalized.includes("basketball") && normalized.includes("summer camp"));
}

export default async function BasketballSummerCampRegisterPage() {
  const events = await fetchEvents();
  const event = events.find((item) => isBasketballSummerCamp(item.title));

  if (!event) {
    notFound();
  }

  const imageUrl = event.imageUrl || "/hero-basketball.jpg";
  const location = event.location || "Infinity Sports Academy";

  return (
    <BasketballSummerCampRegisterClient
      eventTitle={event.title}
      eventDescription={event.description}
      eventImageUrl={imageUrl}
      location={location}
    />
  );
}
