/** The file types the screen may show in its own window; everything else offers a download only. Never SVG or HTML (they can carry script). */
export const PREVIEW_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf'] as const;

export const isPreviewable = (contentType: string): boolean => (PREVIEW_CONTENT_TYPES as readonly string[]).includes(contentType.toLowerCase().split(';')[0]?.trim() ?? '');
