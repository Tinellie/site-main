import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { SiteShell } from "@/components/layout/site-shell";
import { siteConfig } from "@/config/site";
import { AppThemeProvider } from "@/theme/app-theme-provider";

export const metadata: Metadata = {
  title: {
    default: siteConfig.title,
    template: `%s · ${siteConfig.title}`,
  },
  description: siteConfig.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body>
        <AppRouterCacheProvider>
          <AppThemeProvider>
            <SiteShell>{children}</SiteShell>
          </AppThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
