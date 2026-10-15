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
