import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";

import { SiteShell } from "@/components/layout/site-shell";
import { siteConfig } from "@/config/site";
import { AppThemeProvider } from "@/theme/app-theme-provider";
import { AuthProvider } from "@/features/auth/auth-provider";

export const metadata: Metadata = {
  title: {
    default: siteConfig.title,
    template: `%s · ${siteConfig.title}`,
  },
  description: siteConfig.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html id="site-document" lang="zh-CN">
      <body id="site-body">
        <AppRouterCacheProvider>
          <AppThemeProvider>
            <AuthProvider>
              <SiteShell>{children}</SiteShell>
            </AuthProvider>
          </AppThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
