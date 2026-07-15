import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigationState } from "@app/contexts/NavigationContext";
import { useToolNavigation } from "@app/hooks/useToolNavigation";
import { useToolWorkflow } from "@app/contexts/ToolWorkflowContext";
import { ToolId } from "@app/types/toolId";

// Material UI Icons
import CompressIcon from "@mui/icons-material/Compress";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import CropIcon from "@mui/icons-material/Crop";
import TextFieldsIcon from "@mui/icons-material/TextFields";

export interface SuggestedTool {
  id: ToolId;
  title: string;
  icon: React.ComponentType<any>;
  href: string;
  onClick: (e: React.MouseEvent) => void;
}

interface SuggestedToolDefinition {
  id: ToolId;
  titleKey: string;
  titleFallback: string;
  icon: React.ComponentType<any>;
}

const ALL_SUGGESTED_TOOLS: SuggestedToolDefinition[] = [
  {
    id: "compress",
    titleKey: "home.compress.title",
    titleFallback: "Compress",
    icon: CompressIcon,
  },
  {
    id: "convert",
    titleKey: "home.convert.title",
    titleFallback: "Convert",
    icon: SwapHorizIcon,
  },
  {
    id: "sanitize",
    titleKey: "home.sanitize.title",
    titleFallback: "Sanitize",
    icon: CleaningServicesIcon,
  },
  {
    id: "split",
    titleKey: "home.split.title",
    titleFallback: "Split",
    icon: CropIcon,
  },
  {
    id: "ocr",
    titleKey: "home.ocr.title",
    titleFallback: "OCR",
    icon: TextFieldsIcon,
  },
];

export function useSuggestedTools(): SuggestedTool[] {
  const { t } = useTranslation();
  const { selectedTool } = useNavigationState();
  const { getToolNavigation } = useToolNavigation();
  const { getSelectedTool } = useToolWorkflow();

  return useMemo(() => {
    // Filter out the current tool
    const filteredTools = ALL_SUGGESTED_TOOLS.filter(
      (tool) => tool.id !== selectedTool,
    ).map((tool) => ({
      id: tool.id,
      icon: tool.icon,
      title: t(tool.titleKey, tool.titleFallback),
    }));

    // Add navigation props to each tool
    return filteredTools.map((tool) => {
      const toolRegistryEntry = getSelectedTool(tool.id);
      if (!toolRegistryEntry) {
        // Fallback for tools not in registry
        return {
          ...tool,
          href: `/${tool.id}`,
          onClick: (e: React.MouseEvent) => {
            e.preventDefault();
          },
        };
      }

      const navProps = getToolNavigation(tool.id, toolRegistryEntry);
      return {
        ...tool,
        ...navProps,
      };
    });
  }, [selectedTool, getToolNavigation, getSelectedTool, t]);
}
