export interface MarkdownEditorProps {
  /** Initial document; change the React key to switch between articles. */
  initialValue?: string;
  onChange?: (markdown: string) => void;
  /** Authenticated upload endpoint implementing Vditor's response format. */
  uploadUrl?: string;
}