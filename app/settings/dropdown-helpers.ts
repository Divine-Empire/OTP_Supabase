// otp_dropdown.category is stored as "word1_word2" (see e.g.
// Database/22_otp_dropdown_and_pre_invoice_fields.sql,
// Database/30_otp_pre_invoice_payment_mode.sql). Settings > Dropdown shows
// it as "Word1-Word2" — display only, never sent back to the API.
export function formatCategoryLabel(category: string): string {
  if (!category) return ""
  return category
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("-")
}
