import type { Tier } from "@portal/contexts/TierContext";
import { WelcomeBanner } from "@portal/components/WelcomeBanner";
import { EditorStatusCard } from "@portal/components/EditorStatusCard";
import { SetupChecklist } from "@portal/components/SetupChecklist";
import { useOnboardingProgress } from "@portal/hooks/useOnboardingProgress";

/**
 * The Home hero with a progress-aware footer:
 *
 *  - no live deployment  → welcome header (+ setup steps until complete)
 *  - deployment live     → deployed-Editor status header (+ steps until complete)
 *  - onboarding complete → header only; the setup steps collapse away
 */
export function HomeHero({ tier }: { tier: Tier }) {
  const progress = useOnboardingProgress();

  const footer = progress.allComplete ? undefined : (
    <SetupChecklist progress={progress} />
  );

  const showStatus = progress.deployed;

  return showStatus ? (
    <EditorStatusCard footer={footer} hideChips={tier === "enterprise"} />
  ) : (
    <WelcomeBanner footer={footer} />
  );
}
