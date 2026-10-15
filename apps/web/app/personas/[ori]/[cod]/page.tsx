'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { fmtCell, getJSON, sendJSON } from '../../../lib/format'

type Persona = Record<string, unknown>

type Telefono = {
  TFCodigo: number
  TFNumTel: string
  TFTipoTel: number
  TFEsCelular: boolean
  TFObserv: string
  tipoDesc: string | null
}

type DecodedField = {
  campo: string
  etiqueta: string
  tabla: string
  codigo: unknown
  descripcion: string | null
}

type Evento = {
  HGCodigo: number
  HGCodOriGes: number
  HGCodGes: number
  HGFecha: string | null
  HGTexto: string
  tipoEvento: string | null
  resultado: string | null
  responsable: string | null
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
  tipoDesc: string | null
}

type GestLink = {
  GECodOri: number
  GECodGest: number
  GECaratula: string
  GENumCar: string
}

type Resp = {
  persona: Persona
  campos: DecodedField[]
  telefonos: Telefono[]
  domicilios: Domicilio[]
  mails: Mail[]
  eventos: Evento[]
  gestionesDeudor: GestLink[]
  gestionesAcreedor: GestLink[]
}

const FORM_FIELDS: Array<{ name: string; label: string; type?: string }> = [
  { name: 'PECodTipDoc', label: 'Tipo Doc.' },
  { name: 'PENumDoc', label: 'N° Doc.' },
  { name: 'PEPrefijo', label: 'Prefijo' },
  { name: 'PEApellido', label: 'Apellido' },
  { name: 'PENombre', label: 'Nombre' },
  { name: 'PESexo', label: 'Sexo' },
  { name: 'PETipo', label: 'Tipo' },
  { name: 'PEClase', label: 'Clase' },
  { name: 'PEEstCiv', label: 'Estado Civil' },
  { name: 'PECondTribut', label: 'Cond. Tributaria' },
  { name: 'PECodNac', label: 'Nacionalidad' },
  { name: 'PECodSitBcra', label: 'Sit. BCRA' },
  { name: 'PEFecNac', label: 'Fec. Nac.', type: 'date' },
  { name: 'PEIDFIscal', label: 'ID Fiscal' },
  { name: 'PEObserv', label: 'Observaciones' },
  { name: 'PEDomCalle', label: 'Calle' },
  { name: 'PEDomNum', label: 'N°' },
  { name: 'PEDomPiso', label: 'Piso' },
  { name: 'PEDomDpto', label: 'Dpto' },
  { name: 'PEDomCodPos', label: 'Cod. Postal' },
  { name: 'PEDomLoc', label: 'Localidad' },
]

export default function PersonaDetailPage() {
  const params = useParams()
  const ori = params?.ori as string
  const cod = params?.cod as string
  const [data, setData] = useState<Resp | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<string | null>(null)

  async function load() {
    if (!ori || !cod) return
    const r = await getJSON<Resp>(`/api/personas/${ori}/${cod}`)
    if (!r) setErr('Persona no encontrada')
    else setData(r)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ori, cod])

  function startEdit() {
    if (!data) return
    const f: Record<string, string> = {}
    for (const { name } of FORM_FIELDS) {
      const v = data.persona[name]
      f[name] = v === null || v === undefined ? '' : fmtCell(v)
    }
    setForm(f)
    setMsg(null)
    setEditing(true)
  }

  async function save() {
    const body: Record<string, unknown> = {}
    for (const { name } of FORM_FIELDS) body[name] = form[name] ?? ''
    const r = await sendJSON(`/api/personas/${ori}/${cod}`, 'PATCH', body)
    if (!r.ok) {
      setMsg(`Error: ${r.error}`)
      return
    }
    setEditing(false)
    setMsg('Guardado correctamente.')
    await load()
  }

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

      {data && !editing && (
        <p>
          <button className="btn" onClick={startEdit}>
            Editar
          </button>{' '}
          {msg && <span className="muted">{msg}</span>}
        </p>
      )}

      {data && editing && (
        <div className="form-card">
          <h2>Editar persona</h2>
          <div className="form-grid">
            {FORM_FIELDS.map(({ name, label, type }) => (
              <label key={name}>
                <span>{label}</span>
                <input
                  type={type ?? 'text'}
                  value={form[name] ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
                />
              </label>
            ))}
          </div>
          {msg && <p style={{ color: '#ff8080' }}>{msg}</p>}
          <div className="row">
            <button className="btn" onClick={save}>
              Guardar
            </button>
            <button
              className="btn ghost"
              onClick={() => {
                setEditing(false)
                setMsg(null)
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {data && (
        <>
          {data.campos.length > 0 && (
            <>
              <h2>Clasificación</h2>
              <div className="detail-grid">
                {data.campos.map((c) => (
                  <div key={c.campo} style={{ display: 'contents' }}>
                    <div className="k" title={c.campo}>
                      {c.etiqueta}
                    </div>
                    <div className="v">
                      {c.descripcion ?? <span className="muted">{fmtCell(c.codigo)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <details style={{ marginTop: 16 }}>
            <summary style={{ cursor: 'pointer' }}>
              Datos crudos ({Object.keys(data.persona).length} campos)
            </summary>
            <div className="detail-grid" style={{ marginTop: 8 }}>
              {Object.entries(data.persona).map(([k, v]) => (
                <div key={k} style={{ display: 'contents' }}>
                  <div className="k">{k}</div>
                  <div className="v">{fmtCell(v)}</div>
                </div>
              ))}
            </div>
          </details>

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
                    <td>{t.tipoDesc ?? t.TFTipoTel}</td>
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
                    <td>{m.tipoDesc ?? m.PMTipo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">Sin correos.</p>
          )}

          <h2 style={{ marginTop: 16 }}>Eventos recientes ({data.eventos.length})</h2>
          {data.eventos.length ? (
            <table className="grid">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Gestión</th>
                  <th>Tipo</th>
                  <th>Resultado</th>
                  <th>Responsable</th>
                  <th>Texto</th>
                </tr>
              </thead>
              <tbody>
                {data.eventos.map((e) => (
                  <tr key={`${e.HGCodOriGes}-${e.HGCodGes}-${e.HGCodigo}`}>
                    <td>{fmtCell(e.HGFecha)}</td>
                    <td>
                      <Link href={`/gestiones/${e.HGCodOriGes}/${e.HGCodGes}`}>
                        #{e.HGCodGes}
                      </Link>
                    </td>
                    <td>{e.tipoEvento ?? <span className="muted">—</span>}</td>
                    <td>{e.resultado ?? <span className="muted">—</span>}</td>
                    <td>{e.responsable ?? <span className="muted">—</span>}</td>
                    <td>{fmtCell(e.HGTexto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">Sin eventos.</p>
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
