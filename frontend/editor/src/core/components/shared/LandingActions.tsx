import React from "react";
import { Group, Tooltip } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Button } from "@app/ui/Button";
import { ActionIcon } from "@app/ui/ActionIcon";
import LocalIcon from "@app/components/shared/LocalIcon";
import { useFileActionTerminology } from "@app/hooks/useFileActionTerminology";
import { useFileActionIcons } from "@app/hooks/useFileActionIcons";
import { useAppConfig } from "@app/contexts/AppConfigContext";
import { useIsMobile } from "@app/hooks/useIsMobile";

type LandingActionsProps = {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onUploadClick: () => void;
  onMobileUploadClick: () => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export function LandingActions({
  fileInputRef,
  onUploadClick,
  onMobileUploadClick,
  onFileSelect,
}: LandingActionsProps) {
  const { t } = useTranslation();
  const terminology = useFileActionTerminology();
  const icons = useFileActionIcons();
  const { config } = useAppConfig();
  const isMobile = useIsMobile();

  return (
    <>
      <Group gap="sm" justify="center" wrap="wrap" mb="xs">
        <Button
          className="landing-btn-primary"
          leftSection={
            <LocalIcon
              icon={icons.uploadIconName}
              width="1rem"
              height="1rem"
              style={{ color: "white" }}
            />
          }
          onClick={(e) => {
            e.stopPropagation();
            onUploadClick();
          }}
        >
          {terminology.uploadFromComputer}
        </Button>

        {config?.enableMobileScanner && !isMobile && (
          <Tooltip label={terminology.mobileUpload} position="bottom">
            <ActionIcon
              size="lg"
              variant="secondary"
              aria-label={terminology.mobileUpload}
              className="landing-btn-secondary landing-btn-icon"
              onClick={(e) => {
                e.stopPropagation();
                onMobileUploadClick();
              }}
            >
              <LocalIcon
                icon="qr-code-rounded"
                width="1.25rem"
                height="1.25rem"
              />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
      <p className="landing-upload-caption">
        {t("landing.uploadSizeCaption", "Upload documents up to 100 MB")}
      </p>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={onFileSelect}
        style={{ display: "none" }}
      />
    </>
  );
}
