import { OnboardingFlow } from "@/src/onboarding/OnboardingFlow";

// First-run flow. Seven screens, exactly three decisions, ends inside the app.
export default function OnboardingScreen() {
  return <OnboardingFlow />;
}
