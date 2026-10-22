import { NextResponse } from "next/server"

// LEGACY chunked mode (?offset=&limit=). The client hook that streamed every chunk was removed:
// all History tabs now page on the server (lib/history-filters.ts + hooks/use-server-history.ts), so
// these helpers are only still reachable by direct API callers and can be deleted with the
// `?offset` branches in the History routes.
// Was: server half of the old chunked-history hook. A History endpoint reads
// ?offset=&limit= via chunkParams, runs its query with
// `.select(..., { count: "exact" })`, a stable order (its date column, then
// `.order("id")` so chunks never overlap or skip rows) and
// `.range(offset, offset + limit - 1)`, and answers with chunkJson.
export function chunkParams(searchParams: URLSearchParams) {
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 200, 1), 1000)
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0)
  return { limit, offset, to: offset + limit - 1 }
}

export function chunkJson(data: any[] | null, count: number | null, offset: number) {
  const rows = data || []
  const total = count ?? offset + rows.length
  return NextResponse.json({ success: true, data: rows, total, hasMore: offset + rows.length < total })
}
