"use client";

import {
  Button, Card, Chip,
  Stack, TextField, Typography,
} from "@mui/material";

import type { PostFilters } from "@/features/blog/types";

export interface PostFilterPanelProps {
  filters: PostFilters;
  availableTags: readonly string[];
  onChange: (filters: PostFilters) => void;
}

export function PostFilterPanel({
  filters,
  availableTags,
  onChange,
}: PostFilterPanelProps) {
  function toggleTag(tag: string) {
    const tags = filters.tags.includes(tag)
      ? filters.tags.filter((selected) => selected !== tag)
      : [...filters.tags, tag];
    onChange({ ...filters, tags });
  }

  return (
    <Card id="post-filter-panel" sx={{ p: 2, flexShrink: 0 }}>
      <Stack spacing={2}>
        <Typography id="pfp-title" component="h2" variant="h6">
          Filters
        </Typography>
        <TextField
          id="pfp-search"
          label="Search posts"
          type="search"
          size="small"
          fullWidth
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
        />
        <TextField
          id="pfp-date-from"
          label="Published from"
          type="date"
          size="small"
          fullWidth
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { max: filters.dateTo || undefined },
          }}
          value={filters.dateFrom}
          onChange={(event) =>
            onChange({ ...filters, dateFrom: event.target.value })
          }
        />
        <TextField
          id="pfp-date-to"
          label="Published until"
          type="date"
          size="small"
          fullWidth
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { min: filters.dateFrom || undefined },
          }}
          value={filters.dateTo}
          onChange={(event) => onChange({ ...filters, dateTo: event.target.value })}
        />

        <Stack id="pfp-tags" spacing={1}>
          <Typography id="pfp-tags-label" component="p" variant="subtitle2">
            Tags · match any
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: "wrap" }}
            aria-labelledby="pfp-tags-label"
          >
            {availableTags.map((tag) => (
              <Chip
                key={tag}
                className="pfp-tag-chip"
                label={tag}
                clickable
                color={filters.tags.includes(tag) ? "primary" : "default"}
                variant={filters.tags.includes(tag) ? "filled" : "outlined"}
                aria-pressed={filters.tags.includes(tag)}
                onClick={() => toggleTag(tag)}
              />
            ))}
          </Stack>
        </Stack>

        <Button
          id="pfp-reset"
          onClick={() =>
            onChange({ search: "", dateFrom: "", dateTo: "", tags: [] })
          }
        >
          Reset filters
        </Button>
      </Stack>
    </Card>
  );
}