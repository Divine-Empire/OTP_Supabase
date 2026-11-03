// A stage page opened from the global search carries ?q=<order no>&tab=<pending|history|...>.
// The page's own search box and tab start from those, so the user lands on that order.
// Client-side only; on the server (or with no / unknown params) it returns the neutral defaults.
export function stageDeepLink(): { q: string; tab: string | null } {
  if (typeof window === "undefined") return { q: "", tab: null }
  const sp = new URLSearchParams(window.location.search)
  const tab = sp.get("tab")
  return {
    q: (sp.get("q") || "").slice(0, 100),
    tab: tab === "pending" || tab === "history" || tab === "material-received" ? tab : null,
  }
}
