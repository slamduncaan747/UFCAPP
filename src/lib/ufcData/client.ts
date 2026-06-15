/**
 * Read access to the scraped UFC data project (a separate Supabase project from
 * the app's own auth/league database). SERVER-ONLY: used by the sync job.
 *
 * We talk to PostgREST directly with fetch rather than @supabase/supabase-js so
 * there's no realtime/WebSocket dependency (which breaks under Node < 22). The
 * service key bypasses RLS and must never reach the browser.
 */

function dataConfig() {
  const url = process.env.UFC_DATA_SUPABASE_URL;
  const key = process.env.UFC_DATA_SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error(
      "UFC_DATA_SUPABASE_URL / UFC_DATA_SUPABASE_SERVICE_KEY not set — cannot read scraped UFC data."
    );
  }
  return { url: url.replace(/\/$/, ""), key };
}

/**
 * Reads an entire table from the data project, paging past Supabase's 1000-row
 * cap (INTEGRATION.md §8.3).
 */
export async function fetchAll<T>(
  table: string,
  columns = "*",
  pageSize = 1000
): Promise<T[]> {
  const { url, key } = dataConfig();
  const out: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const res = await fetch(
      `${url}/rest/v1/${table}?select=${encodeURIComponent(columns)}`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Range: `${from}-${to}`,
          "Range-Unit": "items",
        },
        cache: "no-store",
      }
    );
    if (!res.ok) {
      throw new Error(`Reading ${table}: HTTP ${res.status} ${await res.text()}`);
    }
    const page = (await res.json()) as T[];
    out.push(...page);
    if (page.length < pageSize) break;
  }
  return out;
}
