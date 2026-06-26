export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .replace(/^-+|-+$/g, "");
}

export function makeUniqueSlug(base: string): string {
  const slug = slugify(base);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${slug}-${suffix}`;
}
