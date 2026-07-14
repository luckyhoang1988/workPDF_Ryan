import { Stack, Text, Radio } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ConvertParameters } from "@app/hooks/tools/convert/useConvertParameters";

interface ConvertToWordSettingsProps {
  parameters: ConvertParameters;
  onParameterChange: <K extends keyof ConvertParameters>(
    key: K,
    value: ConvertParameters[K],
  ) => void;
  disabled?: boolean;
}

const ConvertToWordSettings = ({
  parameters,
  onParameterChange,
  disabled = false,
}: ConvertToWordSettingsProps) => {
  const { t } = useTranslation();

  return (
    <Stack gap="sm" data-testid="word-output-settings">
      <Text size="sm" fw={500}>
        {t("convert.wordOutputMode", "Output mode")}:
      </Text>

      <Radio.Group
        value={parameters.wordOptions.editable ? "editable" : "layout"}
        onChange={(value) =>
          onParameterChange("wordOptions", { editable: value === "editable" })
        }
      >
        <Stack gap="xs">
          <Radio
            value="layout"
            disabled={disabled}
            data-testid="word-mode-layout"
            label={t("convert.wordModeLayout", "Keep original layout")}
            description={t(
              "convert.wordModeLayoutDescription",
              "Looks identical to the PDF, but text/tables are placed in fixed positions and won't reflow when edited.",
            )}
          />
          <Radio
            value="editable"
            disabled={disabled}
            data-testid="word-mode-editable"
            label={t("convert.wordModeEditable", "Editable text/tables")}
            description={t(
              "convert.wordModeEditableDescription",
              "Rebuilds the document as real paragraphs and Word tables you can edit normally. Exact visual layout is not preserved.",
            )}
          />
        </Stack>
      </Radio.Group>
    </Stack>
  );
};

export default ConvertToWordSettings;
