'use client'

import { useCallback, useEffect, useState } from 'react'
import { fmtCell, getJSON } from '../lib/format'

type FormSpec = {
  form?: { LFCodOri: number; LFCodigo: number; LFNombre: string }
  cols: Array<{
    LCCodCam: number
    LCItem: number
    LCWidth?: number | null
    LCTexto?: string | null
    LCBanda: string
    LCOrdenOrder?: number | null
    LCVisible?: boolean | null
  }>
  bands: Array<{ LBTipoBan: string }>
}

type Resp = { total: number; page: number; pageSize: number; rows: any[] }

const PAGE = 50

export default function GenericGridPage({
  basePath,
  title,
  entity,
}: {
  basePath: string
  title: string
  entity: string
}) {
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const url = `/api/${entity}?page=${page}&pageSize=${PAGE}${
      query ? `&q=${encodeURIComponent(query)}` : ''
    }`
    const r = await getJSON<Resp>(url)
    setData(r)
    setLoading(false)
  }, [entity, page, query])

  useEffect(() => {
    load()
  }, [load])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1

  return (
    <div>
      <h1>{title}</h1>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault()
          setPage(1)
          setQuery(q)
        }}
      >
        <input
          type="text"
          placeholder="Buscar…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit">Buscar</button>
        {loading && <span className="muted">cargando…</span>}
        <span className="muted" style={{ marginLeft: 'auto' }}>
          {data ? `${data.total} registros` : ''}
        </span>
      </form>

      <table className="grid">
        <thead>
          <tr>
            {data?.rows?.[0] &&
              Object.keys(data.rows[0]).map((k) => (
                <th key={k}>{k}</th>
              ))}
          </tr>
        </thead>
        <tbody>
          {data?.rows.map((row, idx) => (
            <tr key={idx}>
              {Object.values(row).map((v, j) => (
                <td key={j}>{fmtCell(v)}</td>
              ))}
            </tr>
          ))}
          {data && data.rows.length === 0 && (
            <tr>
              <td colSpan={100} className="muted">
                Sin resultados
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="pager">
        <button disabled={page <= 1} onClick={() => setPage(1)}>
          «
        </button>
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          ‹
        </button>
        <span>
          Página {page} / {totalPages}
        </span>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          ›
        </button>
        <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
          »
        </button>
      </div>
    </div>
  )
}
