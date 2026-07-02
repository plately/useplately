/**
 * Lightweight module-level store for deep-link intents.
 * GlobalSearch writes here before navigating; target pages consume on mount
 * OR via the 'desq:deeplink' custom event (for already-mounted pages).
 */
type DeepLink =
  | { type: "task";  id: number }
  | { type: "node";  id: number }
  | null;

let _pending: DeepLink = null;

export function setDeepLink(link: DeepLink) {
  _pending = link;
  // Notify already-mounted pages that a deep-link is ready
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("desq:deeplink", { detail: link }));
  }
}

/** Read and clear in one call — prevents double-firing. */
export function consumeDeepLink(): DeepLink {
  const link = _pending;
  _pending = null;
  return link;
}
