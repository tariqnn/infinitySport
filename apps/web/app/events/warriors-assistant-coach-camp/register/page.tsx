import { BasketballSummerCampRegisterClient } from "../../basketball-summer-camp/register/BasketballSummerCampRegisterClient";

export const metadata = {
  title: "Warriors Assistant Coach Camp Registration | Infinity Sports",
};

export const dynamic = "force-dynamic";

const WARRIORS_ASSISTANT_COACH_CAMP_PACKAGE_NAME = "Warriors Assistant Coach 1-Week Summer Camp";

const warriorsCampOption = {
  packageName: WARRIORS_ASSISTANT_COACH_CAMP_PACKAGE_NAME,
  label: "Warriors Assistant Coach 1-Week Camp",
  shortLabel: "Warriors Coach Camp",
  description: "",
  heroImageUrl: "/warriors-assistant-coach-camp.jpg",
  variant: "short",
} as const;

export default function WarriorsAssistantCoachCampRegisterPage() {
  return (
    <BasketballSummerCampRegisterClient
      eventTitle={warriorsCampOption.label}
      eventDescription={warriorsCampOption.description}
      eventImageUrl={warriorsCampOption.heroImageUrl}
      location="Infinity Sports Academy"
      initialPackageName={WARRIORS_ASSISTANT_COACH_CAMP_PACKAGE_NAME}
      campOptions={[warriorsCampOption]}
    />
  );
}
