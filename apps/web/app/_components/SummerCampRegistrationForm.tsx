"use client";

import { useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { isValidPhoneNumber } from "../../lib/phoneValidation";

const DEFAULT_SUMMER_CAMP_PACKAGE_NAME = "Basketball Summer Camp";

const PHONE_COUNTRIES: Array<{ value: string; label: string }> = [
  { value: "+962", label: "Jordan (+962)" },
  { value: "+966", label: "Saudi Arabia (+966)" },
  { value: "+971", label: "UAE (+971)" },
  { value: "+965", label: "Kuwait (+965)" },
  { value: "+974", label: "Qatar (+974)" },
  { value: "+973", label: "Bahrain (+973)" },
  { value: "+20", label: "Egypt (+20)" },
  { value: "+964", label: "Iraq (+964)" },
  { value: "+961", label: "Lebanon (+961)" },
  { value: "+963", label: "Syria (+963)" },
  { value: "+970", label: "Palestine (+970)" },
  { value: "+90", label: "Turkey (+90)" },
  { value: "+44", label: "UK (+44)" },
  { value: "+1", label: "USA/Canada (+1)" },
];

const uniformSizes = [
  "Youth Small",
  "Youth Medium",
  "Youth Large",
  "Adult Small",
  "Adult Medium",
  "Adult Large",
  "Adult XL",
  "Adult XXL",
];

const allergyOptions = ["None", "Food", "Medicine", "Seasonal", "Other"];
const medicalOptions = ["None", "Asthma", "Previous injury", "Medication", "Other"];
const transportAreas = ["Abdoun", "Dabouq", "Khalda", "Sweifieh", "Shmeisani", "Jabal Amman", "Other"];
const relationships = ["Mother", "Father", "Guardian", "Sibling", "Other"];

type SummerCampForm = {
  fullName: string;
  dateOfBirth: string;
  phoneCountry: string;
  phoneLocal: string;
  email: string;
  medicalCondition: string;
  medicalDetails: string;
  allergies: string;
  allergyDetails: string;
  mediaConsent: "Yes" | "No";
  uniformSize: string;
  needsTransportation: "No" | "Yes";
  transportArea: string;
  transportationLocation: string;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
  sameEmergencyPhone: boolean;
};

const initialForm: SummerCampForm = {
  fullName: "",
  dateOfBirth: "",
  phoneCountry: "+962",
  phoneLocal: "",
  email: "",
  medicalCondition: "None",
  medicalDetails: "",
  allergies: "None",
  allergyDetails: "",
  mediaConsent: "Yes",
  uniformSize: "",
  needsTransportation: "No",
  transportArea: "",
  transportationLocation: "",
  emergencyName: "",
  emergencyRelationship: "",
  emergencyPhone: "",
  sameEmergencyPhone: false,
};

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 transition focus:border-brand-green-primary focus:outline-none focus:ring-1 focus:ring-brand-green-primary";

const labelClass = "block text-sm font-semibold text-gray-700 mb-1";

function calculateAge(dateOfBirth: string) {
  if (!dateOfBirth) return "";
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return "";

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age > 0 ? String(age) : "";
}

function buildCampSummary(form: SummerCampForm, age: string) {
  const lines = [
    `Age: ${age || "-"}`,
    `Medical: ${form.medicalCondition}${form.medicalDetails.trim() ? ` (${form.medicalDetails.trim()})` : ""}`,
    `Allergies: ${form.allergies}${form.allergyDetails.trim() ? ` (${form.allergyDetails.trim()})` : ""}`,
    `Media consent: ${form.mediaConsent}`,
    `Uniform: ${form.uniformSize || "-"}`,
    `Transportation: ${
      form.needsTransportation === "Yes"
        ? `Yes - ${[form.transportArea, form.transportationLocation].filter(Boolean).join(", ")}`
        : "No"
    }`,
    `Emergency: ${[form.emergencyName, form.emergencyRelationship, form.emergencyPhone].filter(Boolean).join(" / ")}`,
  ];

  return lines.join(" | ");
}

export function SummerCampRegistrationForm({
  packageName = DEFAULT_SUMMER_CAMP_PACKAGE_NAME,
  campTitle = packageName,
}: {
  packageName?: string;
  campTitle?: string;
}) {
  const [form, setForm] = useState<SummerCampForm>(initialForm);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const age = useMemo(() => calculateAge(form.dateOfBirth), [form.dateOfBirth]);
  const parentPhoneDigits = form.phoneLocal.replace(/[^\d]/g, "");
  const parentPhone = `${form.phoneCountry}${parentPhoneDigits}`;

  const updateField =
    (field: keyof SummerCampForm) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const target = event.target;
      const value = target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value;

      setStatus("idle");
      setError("");
      setForm((current) => {
        const next = { ...current, [field]: value };
        if ((field === "phoneCountry" || field === "phoneLocal") && current.sameEmergencyPhone) {
          const nextCountry = field === "phoneCountry" ? String(value) : current.phoneCountry;
          const nextLocal = field === "phoneLocal" ? String(value) : current.phoneLocal;
          next.emergencyPhone = `${nextCountry}${nextLocal.replace(/[^\d]/g, "")}`;
        }
        if (field === "sameEmergencyPhone") {
          next.emergencyPhone = value ? `${current.phoneCountry}${current.phoneLocal.replace(/[^\d]/g, "")}` : "";
        }
        return next;
      });
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError("");
    setStatus("submitting");

    const phoneValidation = isValidPhoneNumber(parentPhone);
    if (!phoneValidation.valid) {
      setError(phoneValidation.error || "Please enter a valid parent phone number.");
      setStatus("error");
      return;
    }

    const parsedAge = age ? Number.parseInt(age, 10) : undefined;
    const customerAge =
      typeof parsedAge === "number" && Number.isFinite(parsedAge) && parsedAge > 0 ? parsedAge : undefined;
    const payload = {
      packageName,
      planLabel: buildCampSummary(form, age),
      customerName: form.fullName.trim(),
      customerPhone: parentPhone.trim(),
      customerEmail: form.email.trim(),
      customerAge,
    };

    try {
      const response = await fetch("/api/package-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError((data as { error?: string }).error || "Unable to submit right now. Please try again.");
        setStatus("error");
        return;
      }

      setForm(initialForm);
      setStatus("success");
      formElement.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch {
      setError("Unable to submit right now. Please try again or contact us.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="mx-auto max-w-2xl rounded-card border border-brand-lightBlue/20 bg-white p-8 text-center shadow-card">
        <h2 className="text-xl font-bold text-brand-black">Registration submitted</h2>
        <p className="mt-2 text-sm text-gray-600">
          Thank you. The registration was sent to portal registrations under {packageName}.
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setError("");
          }}
          className="mt-6 rounded-lg bg-[#003DA5] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#003DA5]/90"
        >
          Register another
        </button>
      </div>
    );
  }

  return (
    <form
      className="mx-auto max-w-2xl space-y-5 rounded-card border border-brand-lightBlue/20 bg-white p-6 shadow-card sm:p-8"
      onSubmit={handleSubmit}
    >
      <div>
        <h2 className="text-xl font-bold text-brand-black">Register for {campTitle}</h2>
        <p className="mt-1 text-sm text-gray-600">Fill in the details. We will contact you to confirm.</p>
        <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
          Package: {packageName}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="camp-full-name">
            Player Name *
          </label>
          <input
            id="camp-full-name"
            className={inputClass}
            type="text"
            value={form.fullName}
            onChange={updateField("fullName")}
            placeholder="Full name"
            required
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="camp-date-of-birth">
            Date of Birth *
          </label>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <input
              id="camp-date-of-birth"
              className={inputClass}
              type="date"
              value={form.dateOfBirth}
              onChange={updateField("dateOfBirth")}
              required
            />
            <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-700 sm:min-w-24">
              Age: {age || "-"}
            </div>
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="camp-phone">
            Parent Phone *
          </label>
          <div className="flex gap-2">
            <select
              aria-label="Country code"
              value={form.phoneCountry}
              onChange={updateField("phoneCountry")}
              className="h-[42px] w-[170px] rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-brand-green-primary focus:outline-none focus:ring-1 focus:ring-brand-green-primary"
            >
              {PHONE_COUNTRIES.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </select>
            <input
              id="camp-phone"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-brand-green-primary focus:outline-none focus:ring-1 focus:ring-brand-green-primary"
              type="tel"
              inputMode="numeric"
              value={form.phoneLocal}
              onChange={updateField("phoneLocal")}
              placeholder="7 9000 2200"
              required
            />
          </div>
          {status === "error" && error.toLowerCase().includes("phone") ? (
            <p className="mt-1.5 text-sm text-red-600">{error}</p>
          ) : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="camp-email">
            Email *
          </label>
          <input
            id="camp-email"
            className={inputClass}
            type="email"
            value={form.email}
            onChange={updateField("email")}
            placeholder="parent@example.com"
            required
          />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="camp-medical-condition">
            Medical Condition
          </label>
          <select
            id="camp-medical-condition"
            className={inputClass}
            value={form.medicalCondition}
            onChange={updateField("medicalCondition")}
          >
            {medicalOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {form.medicalCondition !== "None" ? (
            <textarea
              className={`mt-2 ${inputClass}`}
              rows={2}
              value={form.medicalDetails}
              onChange={updateField("medicalDetails")}
              placeholder="Short note"
              required={form.medicalCondition === "Other"}
            />
          ) : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="camp-allergies">
            Allergies
          </label>
          <select
            id="camp-allergies"
            className={inputClass}
            value={form.allergies}
            onChange={updateField("allergies")}
          >
            {allergyOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {form.allergies !== "None" ? (
            <input
              className={`mt-2 ${inputClass}`}
              type="text"
              value={form.allergyDetails}
              onChange={updateField("allergyDetails")}
              placeholder="Short note"
              required={form.allergies === "Other"}
            />
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <fieldset className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-700">Media Consent</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            Allow photos or videos for Infinity Sports website and social media.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {["Yes", "No"].map((option) => (
              <label
                key={option}
                className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                  form.mediaConsent === option
                    ? "border-brand-blue-primary bg-brand-blue-primary/5 text-brand-blue-primary ring-1 ring-brand-blue-primary/20"
                    : "border-gray-300 bg-white text-gray-700 hover:border-brand-green-primary"
                }`}
              >
                <input
                  className="h-4 w-4 accent-brand-blue-primary"
                  type="radio"
                  name="mediaConsent"
                  value={option}
                  checked={form.mediaConsent === option}
                  onChange={updateField("mediaConsent")}
                />
                {option}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className={labelClass} htmlFor="camp-uniform-size">
            Uniform Size
          </label>
          <select
            id="camp-uniform-size"
            className={inputClass}
            value={form.uniformSize}
            onChange={updateField("uniformSize")}
            required
          >
            <option value="">Select size</option>
            {uniformSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm font-semibold text-gray-700">Transportation</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          Door-to-door bus service can be arranged if available in your area.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {["No", "Yes"].map((option) => (
            <label
              key={option}
              className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                form.needsTransportation === option
                  ? "border-brand-blue-primary bg-brand-blue-primary/5 text-brand-blue-primary ring-1 ring-brand-blue-primary/20"
                  : "border-gray-300 bg-white text-gray-700 hover:border-brand-green-primary"
              }`}
            >
              <input
                className="h-4 w-4 accent-brand-blue-primary"
                type="radio"
                name="needsTransportation"
                value={option}
                checked={form.needsTransportation === option}
                onChange={updateField("needsTransportation")}
              />
              {option}
            </label>
          ))}
        </div>
        {form.needsTransportation === "Yes" ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="camp-transport-area">
                Area
              </label>
              <select
                id="camp-transport-area"
                className={inputClass}
                value={form.transportArea}
                onChange={updateField("transportArea")}
                required
              >
                <option value="">Select area</option>
                {transportAreas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="camp-transport-location">
                Landmark
              </label>
              <input
                id="camp-transport-location"
                className={inputClass}
                type="text"
                value={form.transportationLocation}
                onChange={updateField("transportationLocation")}
                placeholder="Building or nearby landmark"
                required
              />
            </div>
          </div>
        ) : null}
      </fieldset>

      <fieldset className="rounded-card border border-brand-lightBlue/20 bg-white p-5">
        <legend className="px-2 text-sm font-semibold text-gray-700">
          Emergency Contact
        </legend>
        <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
          <div>
            <label className={labelClass} htmlFor="camp-emergency-name">
              Name
            </label>
            <input
              id="camp-emergency-name"
              className={inputClass}
              type="text"
              value={form.emergencyName}
              onChange={updateField("emergencyName")}
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="camp-emergency-relationship">
              Relationship
            </label>
            <select
              id="camp-emergency-relationship"
              className={inputClass}
              value={form.emergencyRelationship}
              onChange={updateField("emergencyRelationship")}
              required
            >
              <option value="">Select</option>
              {relationships.map((relationship) => (
                <option key={relationship} value={relationship}>
                  {relationship}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="camp-emergency-phone">
              Phone
            </label>
            <input
              id="camp-emergency-phone"
              className={inputClass}
              type="tel"
              value={form.emergencyPhone}
              onChange={updateField("emergencyPhone")}
              disabled={form.sameEmergencyPhone}
              required
            />
            <label className="mt-3 flex items-center gap-2 text-xs font-bold text-gray-600">
              <input
                className="h-4 w-4 accent-brand-blue-primary"
                type="checkbox"
                checked={form.sameEmergencyPhone}
                onChange={updateField("sameEmergencyPhone")}
                disabled={!parentPhoneDigits}
              />
              Same as parent phone
            </label>
          </div>
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-lg bg-[#003DA5] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#003DA5]/90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "submitting" ? "Submitting..." : "Submit Registration"}
      </button>

      {status === "error" && error && !error.toLowerCase().includes("phone") ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}
    </form>
  );
}
