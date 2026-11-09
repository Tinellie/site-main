"use client";

import NextLink from "next/link";

import { CardActionArea, type SxProps, type Theme } from "@mui/material";

import type { ReactNode } from "react";

export interface CardLinkActionProps {
  href: string;
  children: ReactNode;
  className?: string;
  sx?: SxProps<Theme>;
}

export function CardLinkAction({
  href,
  children,
  className,
  sx,
}: CardLinkActionProps) {
  const external = /^https?:\/\//i.test(href);

  if (!external && !href.startsWith("/") && !href.startsWith("mailto:")) {
    throw new Error("卡片链接仅支持站内路径、HTTP(S) 或 mailto 地址。");
  }
  if (href.startsWith("//")) throw new Error("请为外链提供完整的 HTTP(S) 地址。");

  return (
    <CardActionArea
      component={NextLink}
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={className}
      sx={sx}
    >
      {children}
    </CardActionArea>
  );
}