// Packaging and Dispatch's Transport Mode branches the process form between
// two sections — see Database/59_packaging_dispatch_receiving_section.sql.
// Shared by the page (to pick which section to render) and the route (to
// independently re-check the client's choice rather than trust it).
const RECEIVING_SECTION_MODES = new Set(
  ["By Hand Maniquip Store", "By Hand-Head Office", "By Hand-Warehouse", "Door delivery"].map((m) => m.toLowerCase())
)

export function isReceivingSectionMode(transportMode: string | null | undefined): boolean {
  return RECEIVING_SECTION_MODES.has((transportMode || "").trim().toLowerCase())
}
