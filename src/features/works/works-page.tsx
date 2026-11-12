import { PageTemplate } from "@/components/layout/page-template";
import { CardCollection } from "@/features/cards/card-collection";

export function WorksPage() {
  return (
    <PageTemplate title="Works" hideTitle>
      <CardCollection section="works" />
    </PageTemplate>
  );
}
