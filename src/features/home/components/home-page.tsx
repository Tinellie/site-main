import { Typography } from "@mui/material";

import { PageScreen } from "@/components/layout/page-screen";
import { PageTemplate } from "@/components/layout/page-template";
import { siteConfig } from "@/config/site";

export function HomePage() {
  return (
    <PageTemplate title="Home" paginated ignoreNav transparentNav hideScrollbar>
      <PageScreen
        id="home-intro"
        label="首页第一屏"
        backgroundImage="/images/backgrounds/bg1.JPG"
        backgroundColor="#18232e"
        overlayColor="rgba(0, 0, 0, 0.3)"
        sx={{ 
          display: "grid", placeItems: "center",
        }}
      >
        <Typography
          component="h2"
          variant="h1"
          sx={{
            fontSize: "clamp(3rem, 4vw, 5rem)",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontWeight: 500,
            letterSpacing: "0.3em",
            paddingInlineStart: "0.3em",
            textAlign: "center",
            color: "common.white",
          }}
        >
          {siteConfig.title}
        </Typography>
      </PageScreen>
      {/* <PageScreen
        id="home-more"
        label="首页第二屏"
      >
      </PageScreen> */}
    </PageTemplate>
  );
}