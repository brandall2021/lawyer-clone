'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { fmtCell, getJSON } from '../lib/format'

type Persona = {
  PECodOri: number
  PECodigo: number
  PEApellido: string
  PENombre: string
  PECodTipDoc: string
  PENumDoc: string
  PETipo: string
  PEDomCalle: string
  PEDomLoc: string
}

type Resp = { total: number; page: number; pageSize: number; rows: Persona[] }

const PAGE = 50

export default function PersonasPage() {
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const url = `/api/personas?page=${page}&pageSize=${PAGE}${
      query ? `&q=${encodeURIComponent(query)}` : ''
    }`
    const r = await getJSON<Resp>(url)
    setData(r)
    setLoading(false)
  }, [page, query])

  useEffect(() => {
    load()
  }, [load])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1

  return (
    <div>
      <h1>Personas</h1>
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
          placeholder="Buscar por apellido, nombre o documento…"
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
            <th>Apellido</th>
            <th>Nombre</th>
            <th>Tipo Doc</th>
            <th>N° Doc</th>
            <th>Domicilio</th>
            <th>Localidad</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data?.rows.map((p) => (
            <tr key={`${p.PECodOri}-${p.PECodigo}`}>
              <td>{fmtCell(p.PEApellido)}</td>
              <td>{fmtCell(p.PENombre)}</td>
              <td>{fmtCell(p.PECodTipDoc)}</td>
              <td>{fmtCell(p.PENumDoc)}</td>
              <td>{fmtCell(p.PEDomCalle)}</td>
              <td>{fmtCell(p.PEDomLoc)}</td>
              <td>
                <Link href={`/personas/${p.PECodOri}/${p.PECodigo}`}>ver</Link>
              </td>
            </tr>
          ))}
          {data && data.rows.length === 0 && (
            <tr>
              <td colSpan={7} className="muted">
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
