import type { Meta, StoryObj } from "@storybook/react-vite";
import { Home } from "@portal/views/Home";

const meta: Meta<typeof Home> = {
  title: "Portal/Views/Home",
  component: Home,
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj<typeof Home>;

export const ProTier: Story = { globals: { tier: "pro" } };
export const FreeTier: Story = { globals: { tier: "free" } };
export const EnterpriseTier: Story = { globals: { tier: "enterprise" } };
