'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { fmtCell, getJSON } from '../lib/format'

type ColMeta = {
  name: string
  dataType: string
  udt: string
  nullable: boolean
  position: number
  isPk: boolean
}

type TableMeta = {
  name: string
  hasPk: boolean
  pk: string[]
  columns: ColMeta[]
}

type TableInfo = {
  name: string
  columns: number
  hasPk: boolean
  estimatedRows: number
}

type ListResp = {
  total: number
  page: number
  pageSize: number
  orderBy: string[]
  rows: Record<string, unknown>[]
}

const PAGE = 50
const MAX_VISIBLE_COLS = 18

export default function DatosPage() {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState('')
  const [meta, setMeta] = useState<TableMeta | null>(null)
  const [data, setData] = useState<ListResp | null>(null)
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('table')
    if (t) setSelected(t)
    getJSON<TableInfo[]>('/api/data/tables').then((list) => {
      setTables(list ?? [])
    })
  }, [])

  const loadMeta = useCallback(async (name: string) => {
    if (!name) {
      setMeta(null)
      return
    }
    const m = await getJSON<TableMeta>(`/api/data/table/${encodeURIComponent(name)}`)
    setMeta(m)
  }, [])

  const loadRows = useCallback(async () => {
    if (!selected) {
      setData(null)
      return
    }
    setLoading(true)
    const url = `/api/data/${encodeURIComponent(selected)}?page=${page}&pageSize=${PAGE}${
      query ? `&q=${encodeURIComponent(query)}` : ''
    }`
    const r = await getJSON<ListResp>(url)
    setData(r)
    setLoading(false)
    setDetail(null)
  }, [selected, page, query])

  useEffect(() => {
    setPage(1)
    setQuery('')
    setQ('')
    setDetail(null)
    loadMeta(selected)
  }, [selected, loadMeta])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  const filteredTables = useMemo(() => {
    const f = filter.trim().toLowerCase()
    if (!f) return tables
    return tables.filter((t) => t.name.toLowerCase().includes(f))
  }, [tables, filter])

  const visibleCols = useMemo(() => {
    if (!meta) return []
    return meta.columns.slice(0, MAX_VISIBLE_COLS)
  }, [meta])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1

  const openDetail = useCallback(
    async (row: Record<string, unknown>) => {
      if (!meta || !meta.hasPk || !meta.pk.length) return
      const params = new URLSearchParams()
      for (const c of meta.pk) params.set(c, String(row[c]))
      const d = await getJSON<Record<string, unknown>>(
        `/api/data/${encodeURIComponent(selected)}/row?${params.toString()}`
      )
      setDetail(d)
    },
    [meta, selected]
  )

  return (
    <div>
      <h1>Explorador de datos</h1>

      <div className="toolbar">
        <input
          type="text"
          placeholder="Filtrar tablas…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">— elegir tabla —</option>
          {filteredTables.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name} ({t.columns} cols, ~{t.estimatedRows} filas)
            </option>
          ))}
        </select>
        <span className="muted" style={{ marginLeft: 'auto' }}>
          {tables.length} tablas
        </span>
      </div>

      {selected && (
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
            placeholder="Buscar en texto…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit">Buscar</button>
          {loading && <span className="muted">cargando…</span>}
          <span className="muted" style={{ marginLeft: 'auto' }}>
            {data ? `${data.total} filas` : ''}
          </span>
        </form>
      )}

      {meta && meta.columns.length > MAX_VISIBLE_COLS && (
        <p className="muted">
          Mostrando primeras {MAX_VISIBLE_COLS} de {meta.columns.length} columnas.
        </p>
      )}

      {data && data.rows.length > 0 && (
        <div className="grid-scroll">
          <table className="grid">
            <thead>
              <tr>
                {visibleCols.map((c) => (
                  <th key={c.name} title={`${c.dataType}${c.isPk ? ' · PK' : ''}`}>
                    {c.name}
                  </th>
                ))}
                {meta?.hasPk && <th></th>}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={i}>
                  {visibleCols.map((c) => (
                    <td key={c.name}>{fmtCell(row[c.name])}</td>
                  ))}
                  {meta?.hasPk && (
                    <td>
                      <button className="linklike" onClick={() => openDetail(row)}>
                        ver
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.rows.length === 0 && selected && (
        <p className="muted">Sin resultados</p>
      )}

      {selected && data && (
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
      )}

      {detail && (
        <div className="detail">
          <h2>Detalle de fila</h2>
          <div className="detail-grid">
            {Object.entries(detail).map(([k, v]) => (
              <Fragment key={k}>
                <div className="k">{k}</div>
                <div className="v">{fmtCell(v)}</div>
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
