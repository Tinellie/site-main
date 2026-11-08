import { PageTemplate } from "@/components/layout/page-template";
import { SocialLinkGrid } from "@/features/connect/social-link-grid";
import type { SocialLinkCardProps } from "@/features/connect/social-link-card";

export function ConnectPage() {
  return (
    <PageTemplate title="Connect">
      <SocialLinkGrid items={debugSocialLinks} />
    </PageTemplate>
  );
}

const debugSocialLinks = [
  {
    platform: "GitHub",
    socialId: "@example",
    iconName: "GitHub",
    href: "https://github.com",
  },
  {
    platform: "Email",
    socialId: "hello@example.com",
    iconName: "Email",
    href: "mailto:hello@example.com",
  },
  {
    platform: "Website",
    socialId: "example.com",
    image: "proj-icon.png",
    iconName: "Language",
    href: "https://example.com",
  },
  {
    platform: "Instagram",
    socialId: "@example",
    iconName: "Instagram",
    href: "https://www.instagram.com",
  },
  {
    platform: "LinkedIn",
    socialId: "Example",
    iconName: "LinkedIn",
    href: "https://www.linkedin.com",
  },
  {
    platform: "YouTube",
    socialId: "@example",
    iconName: "YouTube",
    href: "https://www.youtube.com",
  },
] as const satisfies readonly SocialLinkCardProps[];