import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
// For demonstration purposes, assuming user is already authenticated
// In real app, implement protected route logic to fetch existing data if any

export default async function OnboardingPage() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <OnboardingWizard />
    </main>
  );
}
