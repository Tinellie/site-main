import { ResponsiveCardGrid } from "@/components/cards/responsive-card-grid";
import { CardReveal, CardRevealGroup } from "@/components/cards/card-reveal";
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
    <CardRevealGroup>
    <ResponsiveCardGrid
      className="social-link-grid"
      itemSize={{ xs: 12, sm: 6, md: 4 }}
    >
      {items.map((item) => (
        <CardReveal key={item.platform}><SocialLinkCard {...item} /></CardReveal>
      ))}
    </ResponsiveCardGrid>
    </CardRevealGroup>
  );
}