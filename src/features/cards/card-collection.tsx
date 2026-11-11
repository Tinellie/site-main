"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Fab, Stack,
} from "@mui/material";
import { Add } from "@mui/icons-material";

import { ResponsiveCardGrid } from "@/components/cards/responsive-card-grid";
import { PageSection } from "@/components/layout/page-section";
import { useAuth } from "@/features/auth/auth-provider";
import { cardRequest } from "@/features/cards/card-api";
import { EditableCard } from "@/features/cards/editable-card";
import type { CardSection, ContentCard } from "@/features/cards/types";
import { SocialLinkCard } from "@/features/connect/social-link-card";
import { ArticleCard } from "@/features/works/article-card";
import { ProjectCard } from "@/features/works/project-card";

const CardEditor = dynamic(
  () => import("@/features/cards/card-editor").then(module => module.CardEditor),
  { loading: () => <CircularProgress aria-label="加载编辑器中" /> },
);

export function CardCollection({ section }: { section: CardSection }) {
  const { user } = useAuth();
  const [cards, setCards] = useState<ContentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<ContentCard | null | undefined>();
  const [deleting, setDeleting] = useState<ContentCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    cardRequest<{ cards: ContentCard[] }>(`/api/cards?section=${section}`, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setCards(result.cards); })
      .catch(error => {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "卡片加载失败。");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [section, retry]);

  function renderCard(card: ContentCard) {
    const props = { image: card.image, title: card.title, description: card.description, href: card.link };
    return (
      <EditableCard key={card.id} title={card.title} enabled={Boolean(user)}
        onEdit={() => setEditing(card)}
        onDelete={() => { setDeleting(card); setDeleteError(""); }}>
        {card.kind === "connect"
          ? <SocialLinkCard platform={card.title} socialId={card.username} href={card.link} image={card.image} iconName={card.icon} />
          : card.kind === "project" ? <ProjectCard {...props} /> : <ArticleCard {...props} />}
      </EditableCard>
    );
  }

  async function remove() {
    if (!deleting || busy) return;
    setBusy(true);
    setDeleteError("");
    try {
      await cardRequest(`/api/cards/${deleting.id}`, { method: "DELETE" });
      setCards(previous => previous.filter(card => card.id !== deleting.id));
      setDeleting(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "删除失败。");
    } finally { setBusy(false); }
  }

  return (
    <>
      {loading && <CircularProgress aria-label="加载卡片中" />}
      {error && <Alert severity="error" action={<Button onClick={() => {
        setLoading(true); setError(""); setRetry(value => value + 1);
      }}>重试</Button>}>{error}</Alert>}
      {!loading && !error && (section === "connect" ? (
        <ResponsiveCardGrid className="social-link-grid" itemSize={{ xs: 12, sm: 6, md: 4 }}>
          {cards.map(renderCard)}
        </ResponsiveCardGrid>
      ) : (
        <Stack id="wo-sections" spacing={4}>
          <PageSection title="Projects">
            <ResponsiveCardGrid className="project-grid">
              {cards.filter(card => card.kind === "project").map(renderCard)}
            </ResponsiveCardGrid>
          </PageSection>
          <PageSection title="Articles">
            <Stack className="article-list" spacing={2}>{cards.filter(card => card.kind === "article").map(renderCard)}</Stack>
          </PageSection>
        </Stack>
      ))}
      {user && (
        <Fab color="primary" aria-label="新增卡片" onClick={() => setEditing(null)}
          sx={{ position: "fixed", right: 24, bottom: 24 }}><Add /></Fab>
      )}
      {editing !== undefined && (
        <CardEditor card={editing} section={section} onClose={() => setEditing(undefined)}
          onSaved={saved => {
            setCards(previous => editing
              ? previous.map(card => card.id === saved.id ? saved : card)
              : [...previous, saved]);
            setEditing(undefined);
          }} />
      )}
      <Dialog open={Boolean(deleting)} onClose={() => { if (!busy) setDeleting(null); }}>
        <DialogTitle>删除卡片</DialogTitle>
        <DialogContent>
          {deleteError && <Alert severity="error">{deleteError}</Alert>}
          确定删除“{deleting?.title}”？
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setDeleting(null)}>取消</Button>
          <Button disabled={busy} color="error" onClick={() => void remove()}>{busy ? "删除中…" : "删除"}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
