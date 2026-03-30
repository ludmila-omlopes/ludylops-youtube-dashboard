import { RedemptionGrid } from "@/components/redemption-grid";
import { CatalogItemRecord } from "@/lib/types";

type CatalogStripProps = {
  items: CatalogItemRecord[];
  expanded?: boolean;
  viewerBalance?: number;
};

export function CatalogStrip(props: CatalogStripProps) {
  return <RedemptionGrid {...props} />;
}
