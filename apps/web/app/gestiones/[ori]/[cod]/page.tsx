'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { fmtCell, getJSON } from '../../../lib/format'

type PersonaRef = {
  PECodOri: number
  PECodigo: number
  PEApellido: string
  PENombre: string
  PENumDoc: string
} | null

type Deudor = {
  GDCodOriDeu: number
  GDCodDeu: number
  GDTitular: boolean
  GDActivo: boolean
  GDCaracter: string
  GDTelefonos: string
  GDDomicCon: string
  persona: PersonaRef
}

type Acreedor = {
  GACodOriAcr: number
  GACodAcre: number
  GACliente: boolean
  GAActivo: boolean
  GATelefonos: string
  GADomicCon: string
  persona: PersonaRef
}

type Abogado = {
  HACodOri: number
  HACodAbo: number
  HACodCar: number
  persona: PersonaRef
}

type Telefono = {
  TFCodigo: number
  TFNumTel: string
  TFTipoTel: number
  TFEsCelular: boolean
}

type Agenda = {
  AGCodigo: number
  AGFecha: string
  AGTexto: string
  AGEstado: number
}

type Resp = {
  gestion: Record<string, unknown>
  historialCount: number
  deudores: Deudor[]
  acreedores: Acreedor[]
  abogados: Abogado[]
  telefonos: Telefono[]
  agenda: Agenda[]
}

function personaCell(p: PersonaRef) {
  if (!p) return <span className="muted">—</span>
  return (
    <Link href={`/personas/${p.PECodOri}/${p.PECodigo}`}>
      {fmtCell(p.PEApellido)} {fmtCell(p.PENombre)}
    </Link>
  )
}

export default function GestionDetailPage() {
  const params = useParams()
  const ori = params?.ori as string
  const cod = params?.cod as string
  const [data, setData] = useState<Resp | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!ori || !cod) return
    ;(async () => {
      const r = await getJSON<Resp>(`/api/gestiones/${ori}/${cod}`)
      if (!r) setErr('Gestión no encontrada')
      else setData(r)
    })()
  }, [ori, cod])

  return (
    <div>
      <p>
        <Link href="/gestiones">← Gestiones</Link>
      </p>
      <h1>
        {data ? fmtCell(data.gestion.GECaratula) : 'Gestión'}{' '}
        <span className="muted">
          #{ori}-{cod}
        </span>
      </h1>
      {err && <p style={{ color: '#ff8080' }}>{err}</p>}

      {data && (
        <>
          <h2>Datos</h2>
          <div className="detail-grid">
            {Object.entries(data.gestion).map(([k, v]) => (
              <div key={k} style={{ display: 'contents' }}>
                <div className="k">{k}</div>
                <div className="v">{fmtCell(v)}</div>
              </div>
            ))}
          </div>

          <h2 style={{ marginTop: 16 }}>Deudores ({data.deudores.length})</h2>
          <table className="grid">
            <thead>
              <tr>
                <th>Persona</th>
                <th>Titular</th>
                <th>Activo</th>
                <th>Carácter</th>
                <th>Teléfonos</th>
                <th>Domicilio</th>
              </tr>
            </thead>
            <tbody>
              {data.deudores.map((d) => (
                <tr key={`${d.GDCodOriDeu}-${d.GDCodDeu}`}>
                  <td>{personaCell(d.persona)}</td>
                  <td>{d.GDTitular ? 'Sí' : 'No'}</td>
                  <td>{d.GDActivo ? 'Sí' : 'No'}</td>
                  <td>{fmtCell(d.GDCaracter)}</td>
                  <td>{fmtCell(d.GDTelefonos)}</td>
                  <td>{fmtCell(d.GDDomicCon)}</td>
                </tr>
              ))}
              {data.deudores.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    Sin deudores.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <h2 style={{ marginTop: 16 }}>Acreedores ({data.acreedores.length})</h2>
          <table className="grid">
            <thead>
              <tr>
                <th>Persona</th>
                <th>Cliente</th>
                <th>Activo</th>
                <th>Teléfonos</th>
                <th>Domicilio</th>
              </tr>
            </thead>
            <tbody>
              {data.acreedores.map((a) => (
                <tr key={`${a.GACodOriAcr}-${a.GACodAcre}`}>
                  <td>{personaCell(a.persona)}</td>
                  <td>{a.GACliente ? 'Sí' : 'No'}</td>
                  <td>{a.GAActivo ? 'Sí' : 'No'}</td>
                  <td>{fmtCell(a.GATelefonos)}</td>
                  <td>{fmtCell(a.GADomicCon)}</td>
                </tr>
              ))}
              {data.acreedores.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    Sin acreedores.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <h2 style={{ marginTop: 16 }}>Abogados ({data.abogados.length})</h2>
          <table className="grid">
            <thead>
              <tr>
                <th>Persona</th>
                <th>Carácter</th>
              </tr>
            </thead>
            <tbody>
              {data.abogados.map((a) => (
                <tr key={`${a.HACodOri}-${a.HACodAbo}`}>
                  <td>{personaCell(a.persona)}</td>
                  <td>{a.HACodCar}</td>
                </tr>
              ))}
              {data.abogados.length === 0 && (
                <tr>
                  <td colSpan={2} className="muted">
                    Sin abogados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <h2 style={{ marginTop: 16 }}>Teléfonos ({data.telefonos.length})</h2>
          {data.telefonos.length ? (
            <table className="grid">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Tipo</th>
                  <th>Celular</th>
                </tr>
              </thead>
              <tbody>
                {data.telefonos.map((t) => (
                  <tr key={t.TFCodigo}>
                    <td>{fmtCell(t.TFNumTel)}</td>
                    <td>{t.TFTipoTel}</td>
                    <td>{t.TFEsCelular ? 'Sí' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">Sin teléfonos.</p>
          )}

          <h2 style={{ marginTop: 16 }}>Agenda ({data.agenda.length})</h2>
          {data.agenda.length ? (
            <table className="grid">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Texto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.agenda.map((a) => (
                  <tr key={a.AGCodigo}>
                    <td>{fmtCell(a.AGFecha)}</td>
                    <td>{fmtCell(a.AGTexto)}</td>
                    <td>{a.AGEstado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">Sin eventos.</p>
          )}

          <h2 style={{ marginTop: 16 }}>Historial</h2>
          <p className="muted">
            {data.historialCount} movimientos en HistDeta.{' '}
            <Link
              href={`/datos?table=HistDeta`}
            >
              explorar
            </Link>
          </p>
        </>
      )}
    </div>
  )
}
