'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { fmtCell, getJSON } from '../../../lib/format'

type Persona = Record<string, unknown>

type Telefono = {
  TFCodigo: number
  TFNumTel: string
  TFTipoTel: number
  TFEsCelular: boolean
  TFObserv: string
}

type Domicilio = {
  PDNro: number
  PDCalle: string
  PDNum: string
  PDPiso: string
  PDDpto: string
  PDLoc: string
  PDObs: string
}

type Mail = {
  PMCodigo: number
  PMAddres: string
  PMDescrip: string
  PMTipo: number
}

type GestLink = {
  GECodOri: number
  GECodGest: number
  GECaratula: string
  GENumCar: string
}

type Resp = {
  persona: Persona
  telefonos: Telefono[]
  domicilios: Domicilio[]
  mails: Mail[]
  gestionesDeudor: GestLink[]
  gestionesAcreedor: GestLink[]
}

export default function PersonaDetailPage() {
  const params = useParams()
  const ori = params?.ori as string
  const cod = params?.cod as string
  const [data, setData] = useState<Resp | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!ori || !cod) return
    ;(async () => {
      const r = await getJSON<Resp>(`/api/personas/${ori}/${cod}`)
      if (!r) setErr('Persona no encontrada')
      else setData(r)
    })()
  }, [ori, cod])

  const gLink = (g: GestLink) => (
    <Link key={`${g.GECodOri}-${g.GECodGest}`} href={`/gestiones/${g.GECodOri}/${g.GECodGest}`}>
      {fmtCell(g.GECaratula) || `#${g.GECodGest}`}
    </Link>
  )

  return (
    <div>
      <p>
        <Link href="/personas">← Personas</Link>
      </p>
      <h1>
        {data
          ? `${fmtCell(data.persona.PEApellido)} ${fmtCell(data.persona.PENombre)}`
          : 'Persona'}{' '}
        <span className="muted">
          #{ori}-{cod}
        </span>
      </h1>
      {err && <p style={{ color: '#ff8080' }}>{err}</p>}

      {data && (
        <>
          <h2>Datos</h2>
          <div className="detail-grid">
            {Object.entries(data.persona).map(([k, v]) => (
              <div key={k} style={{ display: 'contents' }}>
                <div className="k">{k}</div>
                <div className="v">{fmtCell(v)}</div>
              </div>
            ))}
          </div>

          <h2 style={{ marginTop: 16 }}>Teléfonos ({data.telefonos.length})</h2>
          {data.telefonos.length ? (
            <table className="grid">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Tipo</th>
                  <th>Celular</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {data.telefonos.map((t) => (
                  <tr key={t.TFCodigo}>
                    <td>{fmtCell(t.TFNumTel)}</td>
                    <td>{t.TFTipoTel}</td>
                    <td>{t.TFEsCelular ? 'Sí' : 'No'}</td>
                    <td>{fmtCell(t.TFObserv)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">Sin teléfonos.</p>
          )}

          <h2 style={{ marginTop: 16 }}>Domicilios ({data.domicilios.length})</h2>
          {data.domicilios.length ? (
            <table className="grid">
              <thead>
                <tr>
                  <th>Nro</th>
                  <th>Calle</th>
                  <th>N°</th>
                  <th>Piso</th>
                  <th>Dpto</th>
                  <th>Localidad</th>
                </tr>
              </thead>
              <tbody>
                {data.domicilios.map((d) => (
                  <tr key={d.PDNro}>
                    <td>{d.PDNro}</td>
                    <td>{fmtCell(d.PDCalle)}</td>
                    <td>{fmtCell(d.PDNum)}</td>
                    <td>{fmtCell(d.PDPiso)}</td>
                    <td>{fmtCell(d.PDDpto)}</td>
                    <td>{fmtCell(d.PDLoc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">Sin domicilios.</p>
          )}

          <h2 style={{ marginTop: 16 }}>Correos ({data.mails.length})</h2>
          {data.mails.length ? (
            <table className="grid">
              <thead>
                <tr>
                  <th>Dirección</th>
                  <th>Descripción</th>
                  <th>Tipo</th>
                </tr>
              </thead>
              <tbody>
                {data.mails.map((m) => (
                  <tr key={m.PMCodigo}>
                    <td>{fmtCell(m.PMAddres)}</td>
                    <td>{fmtCell(m.PMDescrip)}</td>
                    <td>{m.PMTipo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">Sin correos.</p>
          )}

          <h2 style={{ marginTop: 16 }}>
            Gestiones como deudor ({data.gestionesDeudor.length})
          </h2>
          <div className="linklist">
            {data.gestionesDeudor.length ? (
              data.gestionesDeudor.map(gLink)
            ) : (
              <span className="muted">Ninguna.</span>
            )}
          </div>

          <h2 style={{ marginTop: 16 }}>
            Gestiones como acreedor ({data.gestionesAcreedor.length})
          </h2>
          <div className="linklist">
            {data.gestionesAcreedor.length ? (
              data.gestionesAcreedor.map(gLink)
            ) : (
              <span className="muted">Ninguna.</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
