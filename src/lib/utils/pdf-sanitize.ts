/** Replace Unicode chars that cause WinAnsi encoding errors in PDF */
export function sanitizeForPdf(text: string): string {
  return text
    .replace(/\u2011/g, "-") // non-breaking hyphen
    .replace(/\u2013/g, "-") // en dash
    .replace(/\u2014/g, "-") // em dash
    .replace(/\u2018/g, "'") // left single quote
    .replace(/\u2019/g, "'") // right single quote
    .replace(/\u201C/g, '"') // left double quote
    .replace(/\u201D/g, '"') // right double quote
    .replace(/\u2026/g, "...") // ellipsis
    .replace(/\u00A0/g, " "); // non-breaking space
}
