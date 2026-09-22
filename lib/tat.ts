import { getSupabaseAdmin } from "@/lib/supabase"

// Falls back to these if otp_stage_tat has no row for the key yet (should
// only happen if a row was deleted directly in the DB) — matches
// Database/33_otp_stage_tat.sql's seed values.
const FALLBACK_TAT_MINUTES: Record<string, number> = {
  order_acceptable: 7200,
  proforma_invoice: 4320,
  debit_note: 4320,
  check_inventory: 4320,
  debit_note_for_invoice: 4320,
  make_invoice: 4320,
  calibration: 7200,
}

// Reads a stage's configured TAT (Settings > TAT Management) in minutes.
export async function getStageTatMinutes(stageKey: string): Promise<number> {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase.from("otp_stage_tat").select("tat_minutes").eq("stage_key", stageKey).maybeSingle()
  if (data && typeof data.tat_minutes === "number") return data.tat_minutes
  return FALLBACK_TAT_MINUTES[stageKey] ?? 4320
}

// A stage's planned date = the previous stage's record-creation time (`from`,
// normally `new Date()` at the moment that record is created) + this stage's
// TAT duration.
export function addTatMinutes(from: Date, minutes: number): string {
  return new Date(from.getTime() + minutes * 60 * 1000).toISOString()
}
