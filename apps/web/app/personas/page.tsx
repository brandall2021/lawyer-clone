'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fmtCell, getJSON, sendJSON } from '../lib/format'

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
  const router = useRouter()
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [nf, setNf] = useState({ apellido: '', nombre: '', tipoDoc: 'DNI', numDoc: '' })
  const [nmsg, setNmsg] = useState<string | null>(null)

  async function createPersona() {
    if (!nf.apellido.trim() && !nf.nombre.trim()) {
      setNmsg('Ingrese apellido o nombre.')
      return
    }
    const r = await sendJSON<{ PECodOri: number; PECodigo: number }>('/api/personas', 'POST', {
      PEApellido: nf.apellido,
      PENombre: nf.nombre,
      PECodTipDoc: nf.tipoDoc,
      PENumDoc: nf.numDoc,
    })
    if (!r.ok || !r.data) {
      setNmsg(`Error: ${r.error}`)
      return
    }
    router.push(`/personas/${r.data.PECodOri}/${r.data.PECodigo}`)
  }

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
        <button type="button" className="btn ghost" onClick={() => { setCreating((v) => !v); setNmsg(null) }}>
          {creating ? 'Cancelar' : 'Nueva'}
        </button>
        <span className="muted" style={{ marginLeft: 'auto' }}>
          {data ? `${data.total} registros` : ''}
        </span>
      </form>

      {creating && (
        <div className="form-card">
          <h2>Nueva persona</h2>
          <div className="form-grid">
            <label>
              <span>Apellido</span>
              <input value={nf.apellido} onChange={(e) => setNf((f) => ({ ...f, apellido: e.target.value }))} />
            </label>
            <label>
              <span>Nombre</span>
              <input value={nf.nombre} onChange={(e) => setNf((f) => ({ ...f, nombre: e.target.value }))} />
            </label>
            <label>
              <span>Tipo Doc.</span>
              <input value={nf.tipoDoc} onChange={(e) => setNf((f) => ({ ...f, tipoDoc: e.target.value }))} />
            </label>
            <label>
              <span>N° Doc.</span>
              <input value={nf.numDoc} onChange={(e) => setNf((f) => ({ ...f, numDoc: e.target.value }))} />
            </label>
          </div>
          {nmsg && <p style={{ color: '#ff8080' }}>{nmsg}</p>}
          <div className="row">
            <button className="btn" onClick={createPersona}>
              Crear
            </button>
          </div>
        </div>
      )}

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
