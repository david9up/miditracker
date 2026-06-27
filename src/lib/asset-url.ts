/** Public asset path that respects Vite `base` (GitHub Pages subpath). */
export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL
  return `${base}${path.replace(/^\//, '')}`
}
