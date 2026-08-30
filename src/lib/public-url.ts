/** Prefix a `public/` path for GitHub Pages (`/sheet-plan`) vs local `next dev`. */
export function publicUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_BASE_PATH ??
    (process.env.NODE_ENV === "production" ? "/sheet-plan" : "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
