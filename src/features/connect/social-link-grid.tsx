import { ResponsiveCardGrid } from "@/components/cards/responsive-card-grid";
import {
  SocialLinkCard,
  type SocialLinkCardProps,
} from "@/features/connect/social-link-card";

export function SocialLinkGrid({
  items,
}: {
  items: readonly SocialLinkCardProps[];
}) {
  return (
    <ResponsiveCardGrid
      className="social-link-grid"
      itemSize={{ xs: 12, sm: 6, md: 4 }}
    >
      {items.map((item) => (
        <SocialLinkCard key={item.platform} {...item} />
      ))}
    </ResponsiveCardGrid>
  );
}