'use client'

import { useEffect, useState } from 'react'
import { getJSON } from './lib/format'

type Grupo = { codigo: unknown; descripcion: string | null; n: number }
type Anio = { anio: number; n: number }

type Stats = {
  counts: {
    tables: number
    personas: number
    gestiones: number
    eventos: number
    telefonos: number
    deudores: number
    abogados: number
  }
  gestionesHabilitadas: Array<{ habilitada: boolean; n: number }>
  gestionesPorEstado: Grupo[]
  gestionesPorArea: Grupo[]
  gestionesPorMoneda: Grupo[]
  eventosPorTipo: Grupo[]
  eventosPorAnio: Anio[]
}

const nf = new Intl.NumberFormat('es-AR')

function GrupoTable({
  title,
  rows,
  max,
}: {
  title: string
  rows: Grupo[]
  max: number
}) {
  return (
    <div style={{ flex: '1 1 320px', minWidth: 300 }}>
      <h2>{title}</h2>
      <table className="grid">
        <thead>
          <tr>
            <th>Valor</th>
            <th style={{ textAlign: 'right' }}>Cantidad</th>
            <th style={{ width: '45%' }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.descripcion ?? <span className="muted">{String(r.codigo)}</span>}</td>
              <td style={{ textAlign: 'right' }}>{nf.format(r.n)}</td>
              <td>
                <div className="bar">
                  <span style={{ width: `${max ? Math.round((r.n / max) * 100) : 0}%` }} />
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="muted">
                Sin datos.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const s = await getJSON<Stats>('/api/stats')
      if (!s) {
        setError('No se pudo conectar con la API (¿está corriendo en :8080?)')
        return
      }
      setStats(s)
    })()
  }, [])

  const card = (num: number | undefined, lbl: string) => (
    <div className="card">
      <div className="num">{num === undefined ? '—' : nf.format(num)}</div>
      <div className="lbl">{lbl}</div>
    </div>
  )

  const maxOf = (rows: Grupo[]) => rows.reduce((m, r) => Math.max(m, r.n), 0)
  const hab = stats?.gestionesHabilitadas.find((h) => h.habilitada)
  const noHab = stats?.gestionesHabilitadas.find((h) => !h.habilitada)
  const maxAnio = stats ? stats.eventosPorAnio.reduce((m, a) => Math.max(m, a.n), 0) : 0

  return (
    <div>
      <h1>Inicio</h1>
      {error && <p style={{ color: '#ff8080' }}>{error}</p>}
      {!stats && !error && <p className="muted">Cargando…</p>}

      {stats && (
        <>
          <div>
            {card(stats.counts.personas, 'Personas')}
            {card(stats.counts.gestiones, 'Gestiones')}
            {card(stats.counts.eventos, 'Eventos')}
            {card(stats.counts.deudores, 'Deudores')}
            {card(stats.counts.abogados, 'Abogados')}
            {card(stats.counts.telefonos, 'Teléfonos')}
            {card(stats.counts.tables, 'Tablas en PostgreSQL')}
          </div>

          <h2 style={{ marginTop: 20 }}>Situación de gestiones</h2>
          <p className="muted">
            Habilitadas: {hab ? nf.format(hab.n) : 0} · No habilitadas:{' '}
            {noHab ? nf.format(noHab.n) : 0}
          </p>

          <div className="dash-cols">
            <GrupoTable
              title="Gestiones por Estado"
              rows={stats.gestionesPorEstado}
              max={maxOf(stats.gestionesPorEstado)}
            />
            <GrupoTable
              title="Gestiones por Área"
              rows={stats.gestionesPorArea}
              max={maxOf(stats.gestionesPorArea)}
            />
          </div>

          <div className="dash-cols">
            <GrupoTable
              title="Gestiones por Moneda"
              rows={stats.gestionesPorMoneda}
              max={maxOf(stats.gestionesPorMoneda)}
            />
            <GrupoTable
              title="Eventos por Tipo"
              rows={stats.eventosPorTipo}
              max={maxOf(stats.eventosPorTipo)}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <h2>Eventos por año</h2>
            <div className="anio-bars">
              {stats.eventosPorAnio.map((a) => (
                <div
                  key={a.anio}
                  className="anio-bar"
                  title={`${a.anio}: ${nf.format(a.n)}`}
                  style={{ height: `${maxAnio ? Math.round((a.n / maxAnio) * 120) + 2 : 2}px` }}
                >
                  <span>{a.anio}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
