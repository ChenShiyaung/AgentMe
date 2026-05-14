import matter from 'gray-matter';

export interface ParsedDocument {
  data: Record<string, unknown>;
  content: string;
  raw: string;
}

export function parseFrontmatter(raw: string): ParsedDocument {
  const parsed = matter(raw);
  const dataObj = parsed.data as Record<string, unknown>;
  return {
    data: dataObj,
    content: parsed.content,
    raw,
  };
}

export function serializeFrontmatter(data: Record<string, unknown>, content: string): string {
  return matter.stringify(content, data);
}

export function getFrontmatterField<T>(doc: ParsedDocument, field: string): T | undefined {
  const value = doc.data[field];
  return value !== undefined ? (value as T) : undefined;
}
