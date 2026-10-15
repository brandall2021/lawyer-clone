'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { fmtCell, getJSON, sendJSON } from '../../../lib/format'

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
  tipoDesc: string | null
}

type Agenda = {
  AGCodigo: number
  AGFecha: string
  AGTexto: string
  AGEstado: number
  tipoEvento: string | null
  responsable: string | null
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
  HGFecha: string | null
  HGHora: string | null
  HGImporte: number | null
  HGPendiente: boolean
  HGTexto: string
  HGObsText: string | null
  tipoEvento: string | null
  resultado: string | null
  concepto: string | null
  responsable: string | null
  operador: string | null
  moneda: string | null
}

type Resp = {
  gestion: Record<string, unknown>
  campos: DecodedField[]
  eventos: Evento[]
  historialCount: number
  deudores: Deudor[]
  acreedores: Acreedor[]
  abogados: Abogado[]
  telefonos: Telefono[]
  agenda: Agenda[]
}

const FORM_FIELDS: Array<{ name: string; label: string; type?: string }> = [
  { name: 'GECaratula', label: 'Carátula' },
  { name: 'GENumCar', label: 'N° Carpeta' },
  { name: 'GENroPart', label: 'N° Particular' },
  { name: 'GENumExt1', label: 'N° Ext 1' },
  { name: 'GENumExt2', label: 'N° Ext 2' },
  { name: 'GEMontoTran', label: 'Monto', type: 'number' },
  { name: 'GEMoneda', label: 'Moneda', type: 'number' },
  { name: 'GECodTipGes', label: 'Tipo Gestión', type: 'number' },
  { name: 'GECodEst', label: 'Estado', type: 'number' },
  { name: 'GECodSit', label: 'Situación', type: 'number' },
  { name: 'GECodCar', label: 'Cartera', type: 'number' },
  { name: 'GECodAre', label: 'Área', type: 'number' },
  { name: 'GECodRes', label: 'Responsable', type: 'number' },
  { name: 'GECodSuperv', label: 'Supervisor', type: 'number' },
  { name: 'GECodEstrat', label: 'Estrategia', type: 'number' },
  { name: 'GECodMora', label: 'Mora', type: 'number' },
  { name: 'GECodProd', label: 'Producto', type: 'number' },
  { name: 'GECodCamp', label: 'Campaña', type: 'number' },
  { name: 'GECodEstu', label: 'Estudio', type: 'number' },
  { name: 'GECodSeg1', label: 'Segmento 1', type: 'number' },
  { name: 'GECodSeg2', label: 'Segmento 2', type: 'number' },
  { name: 'GECodSeg3', label: 'Segmento 3', type: 'number' },
  { name: 'GECodSeg4', label: 'Segmento 4', type: 'number' },
  { name: 'GEHabilitada', label: 'Habilitada', type: 'checkbox' },
  { name: 'GEPrincipal', label: 'Principal', type: 'checkbox' },
  { name: 'GEComent', label: 'Comentario' },
  { name: 'GEObserv', label: 'Observaciones' },
]

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
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<string | null>(null)

  async function load() {
    if (!ori || !cod) return
    const r = await getJSON<Resp>(`/api/gestiones/${ori}/${cod}`)
    if (!r) setErr('Gestión no encontrada')
    else setData(r)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ori, cod])

  function startEdit() {
    if (!data) return
    const f: Record<string, string> = {}
    for (const { name, type } of FORM_FIELDS) {
      const v = data.gestion[name]
      f[name] = type === 'checkbox' ? String(Boolean(v)) : v === null || v === undefined ? '' : fmtCell(v)
    }
    setForm(f)
    setMsg(null)
    setEditing(true)
  }

  async function save() {
    const body: Record<string, unknown> = {}
    for (const { name, type } of FORM_FIELDS) {
      body[name] = type === 'checkbox' ? form[name] === 'true' : form[name] ?? ''
    }
    const r = await sendJSON(`/api/gestiones/${ori}/${cod}`, 'PATCH', body)
    if (!r.ok) {
      setMsg(`Error: ${r.error}`)
      return
    }
    setEditing(false)
    setMsg('Guardado correctamente.')
    await load()
  }

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
          <h2>Editar gestión</h2>
          <div className="form-grid">
            {FORM_FIELDS.map(({ name, label, type }) =>
              type === 'checkbox' ? (
                <label key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={form[name] === 'true'}
                    onChange={(e) => setForm((f) => ({ ...f, [name]: String(e.target.checked) }))}
                    style={{ width: 'auto' }}
                  />
                  <span>{label}</span>
                </label>
              ) : (
                <label key={name}>
                  <span>{label}</span>
                  <input
                    type={type ?? 'text'}
                    value={form[name] ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
                  />
                </label>
              )
            )}
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
          <h2>Clasificación</h2>
          <div className="detail-grid">
            {data.campos.length === 0 && (
              <div className="v muted" style={{ gridColumn: '1 / -1' }}>
                Sin datos decodificados.
              </div>
            )}
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

          <details style={{ marginTop: 16 }}>
            <summary style={{ cursor: 'pointer' }}>Datos crudos ({Object.keys(data.gestion).length} campos)</summary>
            <div className="detail-grid" style={{ marginTop: 8 }}>
              {Object.entries(data.gestion).map(([k, v]) => (
                <div key={k} style={{ display: 'contents' }}>
                  <div className="k">{k}</div>
                  <div className="v">{fmtCell(v)}</div>
                </div>
              ))}
            </div>
          </details>

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
                    <td>{t.tipoDesc ?? t.TFTipoTel}</td>
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
                  <th>Tipo</th>
                  <th>Texto</th>
                  <th>Responsable</th>
                </tr>
              </thead>
              <tbody>
                {data.agenda.map((a) => (
                  <tr key={a.AGCodigo}>
                    <td>{fmtCell(a.AGFecha)}</td>
                    <td>{a.tipoEvento ?? <span className="muted">—</span>}</td>
                    <td>{fmtCell(a.AGTexto)}</td>
                    <td>{a.responsable ?? <span className="muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">Sin eventos.</p>
          )}

          <h2 style={{ marginTop: 16 }}>Historial de eventos ({data.eventos.length})</h2>
          {data.eventos.length ? (
            <table className="grid">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Resultado</th>
                  <th>Concepto</th>
                  <th>Responsable</th>
                  <th>Importe</th>
                  <th>Pend.</th>
                  <th>Texto</th>
                </tr>
              </thead>
              <tbody>
                {data.eventos.map((e) => (
                  <tr key={e.HGCodigo}>
                    <td>{fmtCell(e.HGFecha)}</td>
                    <td>{e.tipoEvento ?? <span className="muted">—</span>}</td>
                    <td>{e.resultado ?? <span className="muted">—</span>}</td>
                    <td>{e.concepto ?? <span className="muted">—</span>}</td>
                    <td>{e.responsable ?? <span className="muted">—</span>}</td>
                    <td>{e.HGImporte ? `${fmtCell(e.HGImporte)} ${e.moneda ?? ''}` : ''}</td>
                    <td>{e.HGPendiente ? 'Sí' : 'No'}</td>
                    <td>{fmtCell(e.HGTexto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">Sin eventos.</p>
          )}
          <p className="muted" style={{ marginTop: 8 }}>
            {data.historialCount} movimientos en HistDeta.{' '}
            <Link href={`/datos?table=Eventos`}>explorar eventos</Link>
          </p>
        </>
      )}
    </div>
  )
}
