'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fmtCell, getJSON, sendJSON } from '../lib/format'

type Gestion = {
  GECodOri: number
  GECodGest: number
  GECaratula: string
  GENumCar: string
  GENroPart: string
  GEHabilitada: boolean
  GEPrincipal: boolean
  GEMontoTran: string
  GEMoneda: number
}

type Resp = { total: number; page: number; pageSize: number; rows: Gestion[] }

const PAGE = 50

export default function GestionesPage() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [nf, setNf] = useState({ caratula: '', numCar: '', nroPart: '' })
  const [nmsg, setNmsg] = useState<string | null>(null)

  async function createGestion() {
    if (!nf.caratula.trim() && !nf.numCar.trim()) {
      setNmsg('Ingrese carátula o número.')
      return
    }
    const r = await sendJSON<{ GECodOri: number; GECodGest: number }>('/api/gestiones', 'POST', {
      GECaratula: nf.caratula,
      GENumCar: nf.numCar,
      GENroPart: nf.nroPart,
    })
    if (!r.ok || !r.data) {
      setNmsg(`Error: ${r.error}`)
      return
    }
    router.push(`/gestiones/${r.data.GECodOri}/${r.data.GECodGest}`)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const url = `/api/gestiones?page=${page}&pageSize=${PAGE}${
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
      <h1>Gestiones</h1>
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
          placeholder="Buscar por carátula o número…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit">Buscar</button>
        <button type="button" className="btn ghost" onClick={() => { setCreating((v) => !v); setNmsg(null) }}>
          {creating ? 'Cancelar' : 'Nueva'}
        </button>
        {loading && <span className="muted">cargando…</span>}
        <span className="muted" style={{ marginLeft: 'auto' }}>
          {data ? `${data.total} registros` : ''}
        </span>
      </form>

      {creating && (
        <div className="form-card">
          <h2>Nueva gestión</h2>
          <div className="form-grid">
            <label>
              <span>Carátula</span>
              <input value={nf.caratula} onChange={(e) => setNf((f) => ({ ...f, caratula: e.target.value }))} />
            </label>
            <label>
              <span>N° Carpeta</span>
              <input value={nf.numCar} onChange={(e) => setNf((f) => ({ ...f, numCar: e.target.value }))} />
            </label>
            <label>
              <span>N° Particular</span>
              <input value={nf.nroPart} onChange={(e) => setNf((f) => ({ ...f, nroPart: e.target.value }))} />
            </label>
          </div>
          {nmsg && <p style={{ color: '#ff8080' }}>{nmsg}</p>}
          <div className="row">
            <button className="btn" onClick={createGestion}>
              Crear
            </button>
          </div>
        </div>
      )}

      <table className="grid">
        <thead>
          <tr>
            <th>Cód</th>
            <th>Carátula</th>
            <th>N° Car.</th>
            <th>Nro Parte</th>
            <th>Habilitada</th>
            <th>Principal</th>
            <th>Monto</th>
            <th>Mon</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data?.rows.map((g) => (
            <tr key={`${g.GECodOri}-${g.GECodGest}`}>
              <td>{g.GECodGest}</td>
              <td>{fmtCell(g.GECaratula)}</td>
              <td>{fmtCell(g.GENumCar)}</td>
              <td>{fmtCell(g.GENroPart)}</td>
              <td>{fmtCell(g.GEHabilitada)}</td>
              <td>{fmtCell(g.GEPrincipal)}</td>
              <td>{g.GEMontoTran}</td>
              <td>{g.GEMoneda}</td>
              <td>
                <Link href={`/gestiones/${g.GECodOri}/${g.GECodGest}`}>ver</Link>
              </td>
            </tr>
          ))}
          {data && data.rows.length === 0 && (
            <tr>
              <td colSpan={9} className="muted">
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
