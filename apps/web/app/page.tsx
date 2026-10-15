'use client'

import { useEffect, useState } from 'react'
import { getJSON } from './lib/format'

type Stats = {
  tables?: number
  personas?: number
  gestiones?: number
  forms?: number
}

export default function Home() {
  const [stats, setStats] = useState<Stats>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const [t, p, g, f] = await Promise.all([
        getJSON<{ count: number }>('/api/tables/count'),
        getJSON<{ total: number }>('/api/personas?pageSize=1'),
        getJSON<{ total: number }>('/api/gestiones?pageSize=1'),
        getJSON<unknown[]>('/api/meta/forms'),
      ])
      if (!t && !p && !g) {
        setError('No se pudo conectar con la API (¿está corriendo en :8080?)')
        return
      }
      setStats({
        tables: t?.count,
        personas: p?.total,
        gestiones: g?.total,
        forms: f?.length,
      })
    })()
  }, [])

  return (
    <div>
      <h1>Inicio</h1>
      {error && <p style={{ color: '#ff8080' }}>{error}</p>}
      <div className="card">
        <div className="num">{stats.tables ?? '—'}</div>
        <div className="lbl">Tablas en PostgreSQL</div>
      </div>
      <div className="card">
        <div className="num">{stats.personas ?? '—'}</div>
        <div className="lbl">Personas</div>
      </div>
      <div className="card">
        <div className="num">{stats.gestiones ?? '—'}</div>
        <div className="lbl">Gestiones</div>
      </div>
      <div className="card">
        <div className="num">{stats.forms ?? '—'}</div>
        <div className="lbl">Formularios (ListForm)</div>
      </div>
    </div>
  )
}
