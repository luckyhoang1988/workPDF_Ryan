import FreeEditorSlide from "@app/components/onboarding/slides/FreeEditorSlide";
import UsageSnapshotSlide from "@app/components/onboarding/slides/UsageSnapshotSlide";
import TeamSlide from "@app/components/onboarding/slides/TeamSlide";
import type {
  ButtonDefinition as ButtonDefinitionBase,
  HeroDefinition as HeroDefinitionBase,
  SlideDefinition as SlideDefinitionBase,
} from "@app/components/onboarding/onboardingSlideTypes";

export type SlideId = "free-editor" | "usage" | "team";

export type HeroType = "logo" | "bolt" | "team";

export type ButtonAction = "next" | "prev" | "close";

export type FlowState = Record<string, never>;

export type SlideFactoryParams = Record<string, never>;

export type HeroDefinition = HeroDefinitionBase<HeroType>;

export type ButtonDefinition = ButtonDefinitionBase<ButtonAction, FlowState>;

export type SlideDefinition = SlideDefinitionBase<
  SlideId,
  ButtonAction,
  FlowState,
  HeroType,
  SlideFactoryParams
>;

const BACK_BUTTON: ButtonDefinition = {
  key: "back",
  type: "icon",
  icon: "chevron-left",
  group: "left",
  action: "prev",
};

const NEXT_BUTTON: ButtonDefinition = {
  key: "next",
  type: "button",
  label: "onboarding.buttons.next",
  variant: "primary",
  group: "right",
  action: "next",
};

export const SLIDE_DEFINITIONS: Record<SlideId, SlideDefinition> = {
  "free-editor": {
    id: "free-editor",
    createSlide: () => FreeEditorSlide(),
    hero: { type: "logo" },
    buttons: [{ ...NEXT_BUTTON, key: "free-editor-next" }],
  },
  usage: {
    id: "usage",
    createSlide: () => UsageSnapshotSlide(),
    hero: { type: "bolt" },
    buttons: [
      { ...BACK_BUTTON, key: "usage-back" },
      { ...NEXT_BUTTON, key: "usage-next" },
    ],
  },
  team: {
    id: "team",
    createSlide: () => TeamSlide(),
    hero: { type: "team" },
    buttons: [
      { ...BACK_BUTTON, key: "team-back" },
      { ...NEXT_BUTTON, key: "team-next" },
    ],
  },
};
