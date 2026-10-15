import { prisma } from '../db'
import { getTables, ident } from './tables'

export type Decoder = {
  tipo: string
  campo: string
  etiqueta: string
  tabla: string
  cod: string
  des: string
}

// Mapeos extra que no están en ListTipo (verificados contra las columnas reales).
const MANUAL: Decoder[] = [
  // Gestión
  { tipo: 'G', campo: 'GEMoneda', etiqueta: 'Moneda', tabla: 'Monedas', cod: 'MOCodigo', des: 'MODescrip' },
  { tipo: 'G', campo: 'GECodEstu', etiqueta: 'Estudio', tabla: 'Estudios', cod: 'ESTCodigo', des: 'ESTDescrip' },
  { tipo: 'G', campo: 'GECodSuperv', etiqueta: 'Supervisor', tabla: 'Responsa', cod: 'RECodResp', des: 'REDesResp' },
  // Persona
  { tipo: 'P', campo: 'PECodTipDoc', etiqueta: 'Tipo de Documento', tabla: 'TipoDocu', cod: 'TDCodTipDoc', des: 'TDDesTipDoc' },
  { tipo: 'P', campo: 'PEClase', etiqueta: 'Clase', tabla: 'ClasePer', cod: 'CLPCodigo', des: 'CLPDescrip' },
  { tipo: 'P', campo: 'PEEstCiv', etiqueta: 'Estado Civil', tabla: 'EstCivil', cod: 'ESCCodigo', des: 'ESCDescrip' },
  { tipo: 'P', campo: 'PECondTribut', etiqueta: 'Condición Tributaria', tabla: 'CondTrib', cod: 'CTRCodigo', des: 'CTRDescrip' },
  { tipo: 'P', campo: 'PECodSitBcra', etiqueta: 'Situación BCRA', tabla: 'SitBcra', cod: 'SBCodSitBcr', des: 'SBDesSitBcr' },
  { tipo: 'P', campo: 'PECodNac', etiqueta: 'Nacionalidad', tabla: 'Nacion', cod: 'NACodNac', des: 'NADesNac' },
  { tipo: 'P', campo: 'PECodEmp', etiqueta: 'Empleador', tabla: 'Empleadr', cod: 'EMCodEmp', des: 'EMDesEmp' },
  { tipo: 'P', campo: 'PEDomLoc', etiqueta: 'Localidad', tabla: 'Localidad', cod: 'LOCCodigo', des: 'LOCDescrip' },
  { tipo: 'P', campo: 'PEDomCodPrv', etiqueta: 'Provincia', tabla: 'Provinci', cod: 'PRCodPrv', des: 'PRDesPrv' },
  { tipo: 'P', campo: 'PEDomCodPart', etiqueta: 'Partido', tabla: 'Partido', cod: 'PACodigo', des: 'PADescrip' },
  { tipo: 'P', campo: 'PEDomCodDep', etiqueta: 'Departamento', tabla: 'Departam', cod: 'DPCodigo', des: 'DPDescrip' },
  // Teléfono
  { tipo: 'T', campo: 'TFTipoTel', etiqueta: 'Tipo', tabla: 'TipoTele', cod: 'TTECodigo', des: 'TTEDescrip' },
]

type ListTipoRow = {
  tipo: string
  campo: string
  etiqueta: string
  tabla: string
  cod: string
  des: string
}

let decodersCache: { rows: Decoder[]; at: number } | null = null

export async function getDecoders(): Promise<Decoder[]> {
  if (decodersCache && Date.now() - decodersCache.at < 300_000) {
    return decodersCache.rows
  }
  const raw = await prisma.$queryRaw<ListTipoRow[]>`
    SELECT "LTTipoListado"          AS tipo,
           btrim("LTCampoFil")      AS campo,
           btrim("LTLabel")         AS etiqueta,
           btrim("LTTblDetTbl")     AS tabla,
           btrim("LTTblDetCod")     AS cod,
           btrim("LTTblDetDes")     AS des
    FROM "ListTipo"
    WHERE "LTTipoListado" IN ('G', 'E')
      AND "LTTblDetTbl" IS NOT NULL AND btrim("LTTblDetTbl") <> ''
      AND "LTTblDetCod" IS NOT NULL AND btrim("LTTblDetCod") <> ''
      AND "LTTblDetDes" IS NOT NULL AND btrim("LTTblDetDes") <> ''
  `
  const seen = new Set<string>()
  const rows: Decoder[] = []
  for (const r of [...raw, ...MANUAL]) {
    const key = `${r.tipo}|${r.campo}`
    if (seen.has(key)) continue
    seen.add(key)
    rows.push({
      tipo: r.tipo,
      campo: r.campo.trim(),
      etiqueta: (r.etiqueta ?? '').trim() || r.campo.trim(),
      tabla: r.tabla.trim(),
      cod: r.cod.trim(),
      des: r.des.trim(),
    })
  }
  decodersCache = { rows, at: Date.now() }
  return rows
}

async function resolveTable(name: string): Promise<string | null> {
  const tables = await getTables()
  if (tables.has(name)) return name
  const lower = name.toLowerCase()
  for (const k of tables.keys()) if (k.toLowerCase() === lower) return k
  return null
}

const catCache = new Map<string, { map: Map<string, string>; at: number }>()

async function catalogMap(tabla: string, cod: string, des: string): Promise<Map<string, string>> {
  const key = `${tabla}|${cod}|${des}`
  const hit = catCache.get(key)
  if (hit && Date.now() - hit.at < 300_000) return hit.map

  const t = await resolveTable(tabla)
  if (!t) return new Map()
  const meta = (await getTables()).get(t)!
  const cols = new Set(meta.columns.map((c) => c.name))
  if (!cols.has(cod) || !cols.has(des)) return new Map()

  const rows = await prisma.$queryRawUnsafe<Array<{ cod: unknown; des: string | null }>>(
    `SELECT ${ident(cod)} AS cod, ${ident(des)} AS des FROM ${ident(t)}`
  )
  const map = new Map<string, string>()
  for (const r of rows) {
    if (r.cod === null || r.cod === undefined || r.des === null) continue
    const k = String(r.cod).trim()
    if (!map.has(k)) map.set(k, r.des.trim())
  }
  catCache.set(key, { map, at: Date.now() })
  return map
}

export async function decodeValue(
  tipo: string,
  campo: string,
  value: unknown
): Promise<string | null> {
  if (value === null || value === undefined || value === '') return null
  const d = (await getDecoders()).find((x) => x.tipo === tipo && x.campo === campo)
  if (!d) return null
  const map = await catalogMap(d.tabla, d.cod, d.des)
  return map.get(String(value).trim()) ?? null
}

export type DecodedField = {
  campo: string
  etiqueta: string
  tabla: string
  codigo: unknown
  descripcion: string | null
}

export async function decodeRow(
  tipo: string,
  row: Record<string, unknown>
): Promise<DecodedField[]> {
  const decoders = (await getDecoders()).filter((d) => d.tipo === tipo)
  const out: DecodedField[] = []
  for (const d of decoders) {
    if (!(d.campo in row)) continue
    const code = row[d.campo]
    if (code === null || code === undefined || code === '') continue
    const map = await catalogMap(d.tabla, d.cod, d.des)
    const descripcion = map.get(String(code).trim()) ?? null
    out.push({ campo: d.campo, etiqueta: d.etiqueta, tabla: d.tabla, codigo: code, descripcion })
  }
  return out
}
