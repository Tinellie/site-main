export interface MarkdownEditorProps {
  /** Initial document; change the React key to switch between articles. */
  initialValue?: string;
  onChange?: (markdown: string) => void;
  /** Authenticated upload endpoint implementing Vditor's response format. */
  uploadUrl?: string;
  /** Rename an existing /assets image and return the new URL. */
  onRenameImage?: (sourcePath: string, targetPath: string) => Promise<string>;
}