import React, { useState } from "react";
import { Container } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { useTranslation } from "react-i18next";
import { useFileHandler } from "@app/hooks/useFileHandler";
import { useFileActionTerminology } from "@app/hooks/useFileActionTerminology";
import { useToolWorkflow } from "@app/contexts/ToolWorkflowContext";
import MobileUploadModal from "@app/components/shared/MobileUploadModal";
import { openFilesFromDisk } from "@app/services/openFilesFromDisk";
import { LandingDocumentStack } from "@app/components/shared/LandingDocumentStack";
import { LandingActions } from "@app/components/shared/LandingActions";
import { LandingChecklist } from "@app/components/shared/LandingChecklist";
import "@app/components/shared/LandingPage.css";

const LandingPage = () => {
  const { t } = useTranslation();
  const { addFiles } = useFileHandler();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const terminology = useFileActionTerminology();
  const [mobileUploadModalOpen, setMobileUploadModalOpen] = useState(false);
  const { selectedTool } = useToolWorkflow();

  const handleFileDrop = async (files: File[]) => {
    await addFiles(files);
  };

  const handleNativeUploadClick = async () => {
    const files = await openFilesFromDisk({
      multiple: true,
      onFallbackOpen: () => fileInputRef.current?.click(),
    });
    if (files.length > 0) {
      await addFiles(files);
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      await addFiles(files);
    }
    event.target.value = "";
  };

  const handleFilesReceivedFromMobile = async (files: File[]) => {
    if (files.length > 0) {
      await addFiles(files);
    }
  };

  const dropzone = (
    <Dropzone
      onDrop={handleFileDrop}
      multiple
      activateOnClick={false}
      enablePointerEvents
      aria-label={terminology.dropFilesHere}
      className={`landing-dropzone flex min-h-0 flex-1 cursor-default flex-col items-center justify-center border-none bg-transparent px-4 py-8 shadow-none outline-none${selectedTool ? " landing-dropzone-card" : ""}`}
      styles={{
        root: {
          border: "none !important",
          backgroundColor: "transparent",
          overflow: "visible",
        },
        inner: {
          overflow: "visible",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
        },
      }}
    >
      <LandingDocumentStack />

      <h3 className="landing-title">
        {selectedTool
          ? t("landing.dropFilesHereTitle", "Drop files here")
          : t("landing.workbenchEmptyStateHero", "Drop a PDF anywhere")}
      </h3>

      {selectedTool && (
        <div className="landing-divider">
          <span>{t("landing.orDivider", "OR")}</span>
        </div>
      )}

      <LandingActions
        fileInputRef={fileInputRef}
        onUploadClick={() => void handleNativeUploadClick()}
        onMobileUploadClick={() => setMobileUploadModalOpen(true)}
        onFileSelect={handleFileSelect}
      />
    </Dropzone>
  );

  return (
    <Container
      size="70rem"
      p={0}
      h="100%"
      className="flex min-h-0 flex-col"
      style={{ position: "relative" }}
    >
      {selectedTool ? (
        <div className="landing-hero-grid">
          <div className="landing-hero-copy">
            <h1 className="landing-hero-title">{selectedTool.name}</h1>
            {selectedTool.description && (
              <p className="landing-hero-subtitle">
                {selectedTool.description}
              </p>
            )}
            <LandingChecklist />
          </div>
          <div className="landing-hero-upload">{dropzone}</div>
        </div>
      ) : (
        dropzone
      )}

      <MobileUploadModal
        opened={mobileUploadModalOpen}
        onClose={() => setMobileUploadModalOpen(false)}
        onFilesReceived={handleFilesReceivedFromMobile}
      />
    </Container>
  );
};

export default LandingPage;
