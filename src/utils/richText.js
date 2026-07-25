import DOMPurify from 'dompurify';

const HTML_TAG_RE = /<[a-z][\s\S]*>/i;

/**
 * Sanitizes a field that may hold either legacy plain text (pre-WYSIWYG,
 * newlines only) or real HTML from RichTextEditor — line breaks in the
 * plain-text case are converted first, since a bare "\n" renders as
 * nothing in HTML. Returns a string safe to pass to dangerouslySetInnerHTML.
 */
export function sanitizeRichText(value) {
  if (!value) return '';
  const html = HTML_TAG_RE.test(value) ? value : value.replace(/\n/g, '<br>');
  return DOMPurify.sanitize(html);
}

/** Plain-text extraction for truncated list previews — a rendered <table>
 * or heading doesn't mean anything useful clipped to one line. */
export function stripHtml(value) {
  if (!value) return '';
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
