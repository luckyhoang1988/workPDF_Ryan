import { SlideId } from "@app/components/onboarding/saasOnboardingFlowConfig";
import {
  resolveFlowIds,
  type FlowStep,
} from "@app/components/onboarding/onboardingSlideTypes";

export interface SaasFlowInputs {
  /** Free-tier wallet with one-time allowance remaining — show the usage meter. */
  showUsageSlide: boolean;
  /** Team leaders only — invited members and anonymous guests skip the team slide. */
  showTeamSlide: boolean;
}

// The SaaS flow as data: the usage meter and team slides slot in when their
// conditions hold. This is the same "flow = the steps that apply, in order"
// shape the core flow uses, resolved through the shared {@link resolveFlowIds}
// helper.
const SAAS_FLOW: FlowStep<SlideId, SaasFlowInputs>[] = [
  { id: "free-editor", when: () => true },
  { id: "usage", when: (input) => input.showUsageSlide },
  { id: "team", when: (input) => input.showTeamSlide },
];

/**
 * Resolves the SaaS onboarding slide sequence.
 */
export function resolveSaasFlow(inputs: SaasFlowInputs): SlideId[] {
  return resolveFlowIds(SAAS_FLOW, inputs);
}
