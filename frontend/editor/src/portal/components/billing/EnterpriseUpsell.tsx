import { useTranslation } from "react-i18next";
import { Card } from "@app/ui";

interface Props {
  /** Render without the Card wrapper, to embed inside another card's column. */
  bare?: boolean;
}

/** Enterprise upsell copy without a procurement/checkout CTA. */
export function EnterpriseUpsell({ bare = false }: Props) {
  const { t } = useTranslation();
  const body = (
    <>
      <span className="portal-billing__eyebrow">
        {t(
          "portal.billing.enterpriseUpsell.eyebrow",
          "Volume discount · 1M+ PDFs",
        )}
      </span>
      <div className="portal-billing__enterprise-head">
        <div>
          <h3 className="portal-billing__section-title">
            {t("portal.billing.enterpriseUpsell.title", "RyanPDF Enterprise")}
          </h3>
          <p className="portal-billing__section-sub">
            {t(
              "portal.billing.enterpriseUpsell.description",
              "Committed volume discounts, air-gapped deployment, custom MSA and security reviews, and 3rd-party distributor partnerships.",
            )}
          </p>
        </div>
      </div>
    </>
  );
  if (bare)
    return <div className="portal-billing__enterprise-bare">{body}</div>;
  return <Card padding="loose">{body}</Card>;
}
