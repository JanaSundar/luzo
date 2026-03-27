/**
 * When a saved name is the default `${method} ${url}` (or user-prefixed with method),
 * strip the method so UI can show the HTTP method badge/chip once.
 */
export function stripMethodPrefixFromRequestName(name: string, method: string): string {
  const prefix = `${method} `;
  if (name.startsWith(prefix)) {
    return name.slice(prefix.length);
  }
  return name;
}

/** True when the visible title is the same as the full URL (avoid showing URL twice). */
export function isStrippedRequestNameEqualToUrl(
  name: string,
  method: string,
  url: string,
): boolean {
  return stripMethodPrefixFromRequestName(name, method).trim() === url.trim();
}
