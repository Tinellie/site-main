export type CardKind = "connect" | "project" | "article";
export type CardSection = "connect" | "works";

export interface ContentCard {
  id: number;
  kind: CardKind;
  title: string;
  username: string;
  link: string;
  description: string;
  image: string;
  icon: string;
}

export type CardInput = Omit<ContentCard, "id">;
