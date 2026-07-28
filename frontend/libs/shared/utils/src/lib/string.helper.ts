/**
 * Strip HTML tags from a string. Returns empty string for null/undefined input.
 */
export const stripHtml = (text?: string | null): string => {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, '');
};
