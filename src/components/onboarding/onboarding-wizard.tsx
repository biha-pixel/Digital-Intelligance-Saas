"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Globe,
  MapPin,
  Sparkles,
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Globe as Twitter,
  Globe as Linkedin,
  Globe as Facebook,
  Globe as Instagram,
  Globe as Youtube,
  Globe as Github,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TagInput } from "@/components/ui/tag-input";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  INDUSTRY_OPTIONS,
  COUNTRY_OPTIONS,
  FIELD_EXPLANATIONS,
  calculateCompletenessScore,
  type CompanyProfileInput,
  type LocationInput,
} from "@/lib/validations/company-profile";
import { saveCompanyProfile } from "@/lib/actions/company-profile";

interface OnboardingWizardProps {
  initialData?: Partial<CompanyProfileInput> | null;
  organizationName?: string;
}

const STEPS = [
  { id: 1, title: "Core Profile", icon: Building2, description: "Entity details & classification" },
  { id: 2, title: "Digital Identity", icon: Globe, description: "Domain, aliases & social handles" },
  { id: 3, title: "Physical Locations", icon: MapPin, description: "Headquarters & branch offices" },
  { id: 4, title: "Review & Readiness", icon: Sparkles, description: "Completeness & verification" },
];

export function OnboardingWizard({ initialData, organizationName }: OnboardingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isPending, setIsPending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = React.useState(false);

  // Form State
  const [formData, setFormData] = React.useState<CompanyProfileInput>({
    companyName: initialData?.companyName || organizationName || "",
    displayName: initialData?.displayName || initialData?.companyName || organizationName || "",
    primaryDomain: initialData?.primaryDomain || "",
    country: initialData?.country || "US",
    industry: initialData?.industry || "B2B SaaS & Software",
    locations: initialData?.locations || [],
    aliases: initialData?.aliases || [],
    socialHandles: {
      twitter: initialData?.socialHandles?.twitter || "",
      linkedin: initialData?.socialHandles?.linkedin || "",
      facebook: initialData?.socialHandles?.facebook || "",
      instagram: initialData?.socialHandles?.instagram || "",
      youtube: initialData?.socialHandles?.youtube || "",
      github: initialData?.socialHandles?.github || "",
    },
  });

  // Current location form item (temporary state for adding new location)
  const [newLocation, setNewLocation] = React.useState<LocationInput>({
    locationName: "Headquarters",
    address: "",
    city: "",
    stateRegion: "",
    country: "US",
    postalCode: "",
    latitude: null,
    longitude: null,
  });

  const completenessScore = React.useMemo(() => {
    return calculateCompletenessScore(formData);
  }, [formData]);

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.companyName || formData.companyName.trim().length < 2) {
        errors.companyName = "Company name must be at least 2 characters.";
      }
      if (!formData.country) {
        errors.country = "Please select a primary country.";
      }
      if (!formData.industry) {
        errors.industry = "Please select an industry vertical.";
      }
    }

    if (step === 2) {
      if (formData.primaryDomain && formData.primaryDomain.trim() !== "") {
        const clean = formData.primaryDomain
          .trim()
          .toLowerCase()
          .replace(/^https?:\/\//, "")
          .replace(/^www\./, "")
          .replace(/\/.*$/, "");
        const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
        if (!domainRegex.test(clean)) {
          errors.primaryDomain = "Invalid domain format (e.g. acme.com or app.acme.com).";
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setErrorMessage(null);
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handleBack = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const addLocation = () => {
    if (!newLocation.locationName.trim() || !newLocation.city.trim() || !newLocation.country.trim()) {
      setErrorMessage("Please fill in location name, city, and country.");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      locations: [...prev.locations, { ...newLocation }],
    }));

    setNewLocation({
      locationName: "",
      address: "",
      city: "",
      stateRegion: "",
      country: formData.country || "US",
      postalCode: "",
      latitude: null,
      longitude: null,
    });
    setErrorMessage(null);
  };

  const removeLocation = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      locations: prev.locations.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    setIsPending(true);
    setErrorMessage(null);

    try {
      const result = await saveCompanyProfile(formData);
      if (!result.success) {
        setErrorMessage(result.error || "Failed to save company profile.");
        if (result.validationErrors) {
          const flatErrors: Record<string, string> = {};
          for (const [key, msgs] of Object.entries(result.validationErrors)) {
            flatErrors[key] = msgs[0] || "Invalid value";
          }
          setFieldErrors(flatErrors);
        }
      } else {
        setIsSuccess(true);
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 1500);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Wizard Header */}
      <div className="mb-8 text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Phase 5: Company Intelligence Setup</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Company Onboarding & Digital Footprint
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Establish your organizational baseline for AI-driven customer sentiment benchmarking.
          </p>
        </div>

        {/* Completeness Score Pill */}
        <div className="flex flex-col items-center sm:items-end bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Readiness Score:
            </span>
            <span
              className={`text-sm font-bold ${
                completenessScore >= 80
                  ? "text-emerald-600 dark:text-emerald-400"
                  : completenessScore >= 50
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {completenessScore}%
            </span>
          </div>
          <div className="w-32 bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                completenessScore >= 80
                  ? "bg-emerald-500"
                  : completenessScore >= 50
                  ? "bg-amber-500"
                  : "bg-zinc-500"
              }`}
              style={{ width: `${completenessScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stepper Navigation */}
      <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-2">
        {STEPS.map((step) => {
          const StepIcon = step.icon;
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => {
                if (step.id < currentStep) setCurrentStep(step.id);
              }}
              disabled={step.id > currentStep}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                isCurrent
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                  : isCompleted
                  ? "border-emerald-200 bg-emerald-50/50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300 cursor-pointer"
                  : "border-zinc-200 bg-white text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 cursor-not-allowed opacity-60"
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-semibold text-xs ${
                  isCurrent
                    ? "bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900"
                    : isCompleted
                    ? "bg-emerald-200/60 text-emerald-800 dark:bg-emerald-800/40 dark:text-emerald-300"
                    : "bg-zinc-100 text-zinc-400 dark:bg-zinc-900"
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-semibold leading-tight truncate">
                  {step.id}. {step.title}
                </div>
                <div className="text-[10px] opacity-80 truncate hidden sm:block">
                  {step.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {isSuccess && (
        <Alert variant="success" className="mb-6">
          <Check className="h-4 w-4" />
          <AlertTitle>Onboarding Complete!</AlertTitle>
          <AlertDescription>
            Company intelligence profile successfully stored. Redirecting to your dashboard...
          </AlertDescription>
        </Alert>
      )}

      {/* Wizard Step Content Card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-8">
        {/* STEP 1: Core Company Profile */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Core Organizational Metadata
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Establish the legal identity and primary market sector for benchmark alignment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Company Name */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Legal / Registered Entity Name <span className="text-red-500">*</span>
                  </label>
                  <InfoTooltip content={FIELD_EXPLANATIONS.companyName} />
                </div>
                <Input
                  placeholder="e.g. Acme Corporation, Inc."
                  value={formData.companyName}
                  error={!!fieldErrors.companyName}
                  onChange={(e) =>
                    setFormData({ ...formData, companyName: e.target.value })
                  }
                />
                {fieldErrors.companyName && (
                  <p className="text-xs text-red-500">{fieldErrors.companyName}</p>
                )}
              </div>

              {/* Display Name */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Display Name / Trade Brand (Optional)
                  </label>
                  <InfoTooltip content={FIELD_EXPLANATIONS.displayName} />
                </div>
                <Input
                  placeholder="e.g. Acme"
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData({ ...formData, displayName: e.target.value })
                  }
                />
              </div>

              {/* Primary Country */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Primary Country / Jurisdiction <span className="text-red-500">*</span>
                  </label>
                  <InfoTooltip content={FIELD_EXPLANATIONS.country} />
                </div>
                <Select
                  value={formData.country}
                  error={!!fieldErrors.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </Select>
                {fieldErrors.country && (
                  <p className="text-xs text-red-500">{fieldErrors.country}</p>
                )}
              </div>

              {/* Industry Classification */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Industry Vertical <span className="text-red-500">*</span>
                  </label>
                  <InfoTooltip content={FIELD_EXPLANATIONS.industry} />
                </div>
                <Select
                  value={formData.industry}
                  error={!!fieldErrors.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                >
                  {INDUSTRY_OPTIONS.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </Select>
                {fieldErrors.industry && (
                  <p className="text-xs text-red-500">{fieldErrors.industry}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Digital Identity & Aliases */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Digital Identity, Brand Aliases & Social Channels
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Connect your web domain, product sub-brands, and social handles to eliminate false negatives.
              </p>
            </div>

            {/* Primary Domain */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Primary Website / Domain (Optional if known)
                </label>
                <InfoTooltip content={FIELD_EXPLANATIONS.primaryDomain} />
              </div>
              <Input
                placeholder="e.g. acme.com"
                value={formData.primaryDomain}
                error={!!fieldErrors.primaryDomain}
                onChange={(e) =>
                  setFormData({ ...formData, primaryDomain: e.target.value })
                }
              />
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Protocols (https://) and www prefixes are automatically normalized.
              </p>
              {fieldErrors.primaryDomain && (
                <p className="text-xs text-red-500">{fieldErrors.primaryDomain}</p>
              )}
            </div>

            {/* Brand Aliases / Alternate Names */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Brand Aliases, Product Lines & Trade Names
                </label>
                <InfoTooltip content={FIELD_EXPLANATIONS.aliases} />
              </div>
              <TagInput
                value={formData.aliases}
                onChange={(aliases) => setFormData({ ...formData, aliases })}
                placeholder="Type alias and press Enter (e.g. AcmePay, Acme Cloud)..."
              />
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Press Enter or comma to add each alias. Essential for Reddit, Trustpilot, and forum matching.
              </p>
            </div>

            {/* Social Media Handles */}
            <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Official Social Accounts & Channels (Optional)
                </label>
                <InfoTooltip content={FIELD_EXPLANATIONS.socialHandles} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Twitter / X */}
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                    <Twitter className="h-4 w-4" />
                  </div>
                  <Input
                    placeholder="Twitter/X @handle"
                    value={formData.socialHandles.twitter}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        socialHandles: { ...formData.socialHandles, twitter: e.target.value },
                      })
                    }
                  />
                </div>

                {/* LinkedIn */}
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                    <Linkedin className="h-4 w-4" />
                  </div>
                  <Input
                    placeholder="LinkedIn company slug"
                    value={formData.socialHandles.linkedin}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        socialHandles: { ...formData.socialHandles, linkedin: e.target.value },
                      })
                    }
                  />
                </div>

                {/* GitHub */}
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                    <Github className="h-4 w-4" />
                  </div>
                  <Input
                    placeholder="GitHub organization"
                    value={formData.socialHandles.github}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        socialHandles: { ...formData.socialHandles, github: e.target.value },
                      })
                    }
                  />
                </div>

                {/* YouTube */}
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                    <Youtube className="h-4 w-4" />
                  </div>
                  <Input
                    placeholder="YouTube channel handle"
                    value={formData.socialHandles.youtube}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        socialHandles: { ...formData.socialHandles, youtube: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Physical Locations & Branches */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Physical Locations & Operational Branches
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Configure branch offices, stores, and regional facilities for geo-targeted reviews (Google Maps, Yelp).
                </p>
              </div>
              <InfoTooltip content={FIELD_EXPLANATIONS.locations} />
            </div>

            {/* Existing Locations List */}
            {formData.locations.length > 0 ? (
              <div className="space-y-2">
                {formData.locations.map((loc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {loc.locationName}
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {loc.address ? `${loc.address}, ` : ""}
                          {loc.city}, {loc.country}
                          {loc.postalCode ? ` (${loc.postalCode})` : ""}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLocation(idx)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-200 p-6 text-center dark:border-zinc-800">
                <MapPin className="mx-auto h-8 w-8 text-zinc-400" />
                <h3 className="mt-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  No Physical Locations Added
                </h3>
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  If your business has brick-and-mortar storefronts, offices, or facilities, add them below.
                </p>
              </div>
            )}

            {/* Add New Location Form */}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-4">
              <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Add Location or Facility
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    Location Name
                  </label>
                  <Input
                    placeholder="e.g. Headquarters / NYC Branch"
                    value={newLocation.locationName}
                    onChange={(e) =>
                      setNewLocation({ ...newLocation, locationName: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    City <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. San Francisco"
                    value={newLocation.city}
                    onChange={(e) =>
                      setNewLocation({ ...newLocation, city: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={newLocation.country}
                    onChange={(e) =>
                      setNewLocation({ ...newLocation, country: e.target.value })
                    }
                  >
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    Street Address (Optional)
                  </label>
                  <Input
                    placeholder="e.g. 500 Market St, Suite 400"
                    value={newLocation.address}
                    onChange={(e) =>
                      setNewLocation({ ...newLocation, address: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    State / Region (Optional)
                  </label>
                  <Input
                    placeholder="e.g. CA or Ontario"
                    value={newLocation.stateRegion}
                    onChange={(e) =>
                      setNewLocation({ ...newLocation, stateRegion: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    Postal / Zip Code (Optional)
                  </label>
                  <Input
                    placeholder="e.g. 94105"
                    value={newLocation.postalCode}
                    onChange={(e) =>
                      setNewLocation({ ...newLocation, postalCode: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLocation}
                  className="gap-1.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Location
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Review & Readiness */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Discovery Readiness & Verification Summary
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Review your organizational metadata profile before initializing discovery pipelines.
              </p>
            </div>

            {/* Completeness Assessment Card */}
            <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Overall Profile Completeness
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    Higher completeness maximizes AI crawl accuracy and eliminates false negatives.
                  </div>
                </div>
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {completenessScore}%
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${completenessScore}%` }}
                />
              </div>

              {/* Checklist Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-4 w-4 rounded-full flex items-center justify-center ${
                      formData.companyName ? "bg-emerald-100 text-emerald-600" : "bg-zinc-200 text-zinc-400"
                    }`}
                  >
                    <Check className="h-2.5 w-2.5" />
                  </div>
                  <span className="text-zinc-700 dark:text-zinc-300">Company Name & Entity (+20%)</span>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={`h-4 w-4 rounded-full flex items-center justify-center ${
                      formData.country && formData.industry
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-zinc-200 text-zinc-400"
                    }`}
                  >
                    <Check className="h-2.5 w-2.5" />
                  </div>
                  <span className="text-zinc-700 dark:text-zinc-300">Country & Industry Vertical (+20%)</span>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={`h-4 w-4 rounded-full flex items-center justify-center ${
                      formData.primaryDomain ? "bg-emerald-100 text-emerald-600" : "bg-zinc-200 text-zinc-400"
                    }`}
                  >
                    <Check className="h-2.5 w-2.5" />
                  </div>
                  <span className="text-zinc-700 dark:text-zinc-300">Primary Domain (+20%)</span>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={`h-4 w-4 rounded-full flex items-center justify-center ${
                      formData.locations.length > 0
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-zinc-200 text-zinc-400"
                    }`}
                  >
                    <Check className="h-2.5 w-2.5" />
                  </div>
                  <span className="text-zinc-700 dark:text-zinc-300">Physical Locations (+15%)</span>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={`h-4 w-4 rounded-full flex items-center justify-center ${
                      formData.aliases.length > 0
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-zinc-200 text-zinc-400"
                    }`}
                  >
                    <Check className="h-2.5 w-2.5" />
                  </div>
                  <span className="text-zinc-700 dark:text-zinc-300">Brand Aliases & Sub-Brands (+15%)</span>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={`h-4 w-4 rounded-full flex items-center justify-center ${
                      Object.values(formData.socialHandles).some((h) => h)
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-zinc-200 text-zinc-400"
                    }`}
                  >
                    <Check className="h-2.5 w-2.5" />
                  </div>
                  <span className="text-zinc-700 dark:text-zinc-300">Social Accounts (+10%)</span>
                </div>
              </div>
            </div>

            {/* Profile Summary Details */}
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
              <div className="grid grid-cols-3 p-3 bg-zinc-50 dark:bg-zinc-900 font-medium">
                <span className="text-zinc-500 dark:text-zinc-400">Field</span>
                <span className="col-span-2 text-zinc-900 dark:text-zinc-100">Configured Value</span>
              </div>

              <div className="grid grid-cols-3 p-3">
                <span className="text-zinc-500 dark:text-zinc-400">Company Name</span>
                <span className="col-span-2 font-semibold text-zinc-900 dark:text-zinc-100">
                  {formData.companyName} {formData.displayName ? `(${formData.displayName})` : ""}
                </span>
              </div>

              <div className="grid grid-cols-3 p-3">
                <span className="text-zinc-500 dark:text-zinc-400">Jurisdiction & Sector</span>
                <span className="col-span-2 text-zinc-900 dark:text-zinc-100">
                  {formData.country} • {formData.industry}
                </span>
              </div>

              <div className="grid grid-cols-3 p-3">
                <span className="text-zinc-500 dark:text-zinc-400">Primary Domain</span>
                <span className="col-span-2 text-zinc-900 dark:text-zinc-100">
                  {formData.primaryDomain || (
                    <span className="text-zinc-400 italic">Not specified (discovery will use name)</span>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-3 p-3">
                <span className="text-zinc-500 dark:text-zinc-400">Brand Aliases</span>
                <span className="col-span-2 text-zinc-900 dark:text-zinc-100">
                  {formData.aliases.length > 0 ? (
                    formData.aliases.join(", ")
                  ) : (
                    <span className="text-zinc-400 italic">None configured</span>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-3 p-3">
                <span className="text-zinc-500 dark:text-zinc-400">Locations</span>
                <span className="col-span-2 text-zinc-900 dark:text-zinc-100">
                  {formData.locations.length > 0 ? (
                    `${formData.locations.length} location(s) configured`
                  ) : (
                    <span className="text-zinc-400 italic">None configured</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="mt-8 flex items-center justify-between border-t border-zinc-100 pt-6 dark:border-zinc-800">
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={isPending || isSuccess}
              className="gap-2 text-xs"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {currentStep < STEPS.length ? (
            <Button
              type="button"
              onClick={handleNext}
              className="gap-2 text-xs"
            >
              Next Step
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || isSuccess}
              className="gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? (
                <>Saving Profile & Relational Tables...</>
              ) : isSuccess ? (
                <>Saved! Redirecting...</>
              ) : (
                <>
                  Complete Onboarding
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
