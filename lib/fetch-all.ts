// PostgREST silently caps any un-ranged SELECT at 1000 rows (max-rows), so a
// "give me every pending row" query returns the newest 1000 and drops the rest
// with no error. Un-paginated Pending lists, the dashboard and any other
// whole-table read go through this helper instead: it pages with .range()
// until a short page comes back.
//
// `build` must return a FRESH query each call (supabase builders are
// single-use) with a STABLE order (its sort column, then id) so pages never
// overlap or skip rows, e.g.
//   fetchAllRows((from, to) =>
//     supabase.from("otp_v_x_pending").select("*").order("created_at", { ascending: false }).order("id").range(from, to))
const PAGE = 1000

export async function fetchAllRows<T = any>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1)
    if (error) throw error
    const rows = data || []
    out.push(...rows)
    if (rows.length < PAGE) return out
  }
}
