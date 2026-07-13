import { useTranslation } from "react-i18next";
import LocalIcon from "@app/components/shared/LocalIcon";

export function LandingChecklist() {
  const { t } = useTranslation();

  const bullets = [
    t("landing.checklistBullet1", "Works directly in your browser"),
    t("landing.checklistBullet2", "Keeps original formatting and quality"),
    t("landing.checklistBullet3", "Files are processed and stored locally"),
    t("landing.checklistBullet4", "Ready in seconds"),
  ];

  return (
    <ul className="landing-hero-checklist">
      {bullets.map((bullet) => (
        <li key={bullet} className="landing-hero-checklist-item">
          <LocalIcon
            icon="check-circle-outline-rounded"
            width="1.25rem"
            height="1.25rem"
            className="landing-hero-checklist-icon"
          />
          <span>{bullet}</span>
        </li>
      ))}
    </ul>
  );
}
