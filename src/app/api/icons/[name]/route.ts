import { loadMuiIcon } from "@/lib/cards/icons";

export async function GET(_request: Request, context: RouteContext<"/api/icons/[name]">) {
  const { name } = await context.params;
  try {
    const icon = await loadMuiIcon(name);
    if (!icon) return new Response("Icon not found", { status: 404 });
    return new Response(icon, { headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    } });
  } catch (error) {
    console.error("Icon rendering failed:", error);
    return new Response("Icon rendering failed", { status: 503 });
  }
}
