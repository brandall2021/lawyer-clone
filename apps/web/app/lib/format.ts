export function trim(v: unknown): unknown {
  if (typeof v === 'string') return v.replace(/\s+$/, '')
  return v
}

export function fmtCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  if (typeof v === 'string') return v.replace(/\s+$/, '')
  return String(v)
}

export async function getJSON<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    return (await r.json()) as T
  } catch {
    return null
  }
}

export async function sendJSON<T>(
  url: string,
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body?: unknown
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const j = (await r.json().catch(() => null)) as (T & { error?: string }) | null
    if (!r.ok) return { ok: false, error: j?.error ?? `HTTP ${r.status}` }
    return { ok: true, data: j ?? undefined }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
