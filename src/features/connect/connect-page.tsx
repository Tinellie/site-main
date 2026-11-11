import { PageBackground } from "@/components/layout/page-background";
import { PageTemplate } from "@/components/layout/page-template";
import { CardCollection } from "@/features/cards/card-collection";

export function ConnectPage() {
  return (
    <PageTemplate title="Connect">
      <PageBackground
        backgroundImage="/images/backgrounds/bg2.JPG"
        overlayColor="rgba(0, 0, 0, 0.6)"
      />
      <CardCollection section="connect" />
    </PageTemplate>
  );
}
