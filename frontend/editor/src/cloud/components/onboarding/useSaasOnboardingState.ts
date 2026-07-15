import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@app/auth/UseSession";
import { useWallet } from "@app/hooks/useWallet";
import { useSaaSTeam } from "@app/contexts/SaaSTeamContext";
import {
  SLIDE_DEFINITIONS,
  type ButtonAction,
  type FlowState,
  type SlideId,
} from "@app/components/onboarding/saasOnboardingFlowConfig";
import { resolveSaasFlow } from "@app/components/onboarding/saasFlowResolver";

interface UseSaasOnboardingStateResult {
  currentStep: number;
  totalSteps: number;
  slideDefinition: (typeof SLIDE_DEFINITIONS)[SlideId];
  currentSlide: ReturnType<(typeof SLIDE_DEFINITIONS)[SlideId]["createSlide"]>;
  flowState: FlowState;
  handleButtonAction: (action: ButtonAction) => void;
}

interface UseSaasOnboardingStateProps {
  opened: boolean;
  onClose: () => void;
  slideIds?: SlideId[];
}

export function useSaasOnboardingState({
  opened,
  onClose,
  slideIds,
}: UseSaasOnboardingStateProps): UseSaasOnboardingStateResult | null {
  const { loading } = useAuth();
  const { wallet } = useWallet();
  const { isTeamLeader } = useSaaSTeam();

  const [currentStep, setCurrentStep] = useState<number>(0);

  // Reset state when modal closes
  useEffect(() => {
    if (!opened) {
      setCurrentStep(0);
    }
  }, [opened]);

  // Usage meter only makes sense for free-tier wallets with allowance left;
  // the team slide is for leaders (anonymous guests are never leaders).
  const showUsageSlide = wallet?.status === "free" && wallet.freeRemaining > 0;
  const showTeamSlide = isTeamLeader;

  const flowSlideIds = useMemo(
    () => slideIds ?? resolveSaasFlow({ showUsageSlide, showTeamSlide }),
    [slideIds, showUsageSlide, showTeamSlide],
  );
  const totalSteps = flowSlideIds.length;
  const maxIndex = Math.max(totalSteps - 1, 0);

  // Ensure current step is within bounds
  useEffect(() => {
    if (currentStep >= flowSlideIds.length) {
      setCurrentStep(Math.max(flowSlideIds.length - 1, 0));
    }
  }, [flowSlideIds.length, currentStep]);

  const currentSlideId =
    flowSlideIds[currentStep] ?? flowSlideIds[flowSlideIds.length - 1];
  const slideDefinition = SLIDE_DEFINITIONS[currentSlideId];

  // Create slide with appropriate params - must be called before any early returns
  const currentSlide = useMemo(() => {
    if (!slideDefinition) return null;
    return slideDefinition.createSlide({});
  }, [slideDefinition]);

  // Navigation functions
  const goNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, maxIndex));
  }, [maxIndex]);

  const goPrev = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  // Handle button actions
  const handleButtonAction = useCallback(
    (action: ButtonAction) => {
      switch (action) {
        case "next":
          // If on last slide, close modal
          if (currentStep === maxIndex) {
            onClose();
          } else {
            goNext();
          }
          return;
        case "prev":
          goPrev();
          return;
        case "close":
          onClose();
          return;
        default:
          console.warn(`Unhandled button action: ${action}`);
          return;
      }
    },
    [currentStep, maxIndex, goNext, goPrev, onClose],
  );

  const flowState: FlowState = {};

  // Early return after all hooks have been called
  if (!slideDefinition || !currentSlide || loading) {
    return null;
  }

  return {
    currentStep,
    totalSteps,
    slideDefinition,
    currentSlide,
    flowState,
    handleButtonAction,
  };
}
