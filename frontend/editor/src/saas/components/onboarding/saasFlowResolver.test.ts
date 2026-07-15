import { describe, it, expect } from "vitest";

// Resolves through the saas cascade to the cloud impl
// (src/cloud/components/onboarding/saasFlowResolver.ts). No saas-level shadow
// exists, so this exercises the migrated cloud pure-function directly.
import { resolveSaasFlow } from "@app/components/onboarding/saasFlowResolver";
import type { SlideId } from "@app/components/onboarding/saasOnboardingFlowConfig";

describe("resolveSaasFlow", () => {
  it("shows free-editor, usage and team when all conditions hold", () => {
    expect(
      resolveSaasFlow({ showUsageSlide: true, showTeamSlide: true }),
    ).toEqual<SlideId[]>(["free-editor", "usage", "team"]);
  });

  it("free-editor bookends the flow when the optional middle slides are off", () => {
    expect(
      resolveSaasFlow({ showUsageSlide: false, showTeamSlide: false }),
    ).toEqual<SlideId[]>(["free-editor"]);
  });
});
