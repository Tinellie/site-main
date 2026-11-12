export type CardKind = "connect" | "project" | "article";
export type CardSection = "connect" | "works";

export interface ConnectCategory {
  id: number;
  name: string;
  position: number;
}

export type CategoryMutation = { name: string } | { direction: "up" | "down" };

export interface ContentCard {
  id: number;
  kind: CardKind;
  title: string;
  username: string;
  link: string;
  description: string;
  image: string;
  icon: string;
  categoryId: number | null;
}

export type CardInput = Omit<ContentCard, "id">;
