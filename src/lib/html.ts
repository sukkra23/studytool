/** Plain text of an HTML string (used for search and node previews). */
export function htmlToText(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** Strip anything executable from HTML before rendering it (matters for imported backups). */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,link,meta,form').forEach((el) => el.remove());
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const value = attr.value.trim().toLowerCase();
      if (attr.name.startsWith('on') || value.startsWith('javascript:')) el.removeAttribute(attr.name);
    }
  });
  return doc.body.innerHTML;
}
