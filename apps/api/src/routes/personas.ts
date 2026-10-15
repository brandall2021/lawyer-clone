import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../db'
import { decodeRow, decodeValue, decodeEvento, EVENTO_COLUMNS } from '../lib/decode'

const listSelect = {
  PECodOri: true,
  PECodigo: true,
  PEApellido: true,
  PENombre: true,
  PECodTipDoc: true,
  PENumDoc: true,
  PETipo: true,
  PEDomCalle: true,
  PEDomLoc: true,
} as const

const PERSONA_REQUIRED = [
  'PECodTipDoc', 'PENumDoc', 'PEPrefijo', 'PEApellido', 'PENombre', 'PESexo', 'PETipo',
  'PEDomCalle', 'PEDomTipoUni', 'PEDomUnidad', 'PEDomSubTipoUni', 'PEDomSubUnidad',
  'PEDomNum', 'PEDomPiso', 'PEDomDpto', 'PEDomObs', 'PEDomCodPos', 'PEDomLoc', 'PEDomOrigen',
  'PEDom2Calle', 'PEDom2TipoUni', 'PEDom2Unidad', 'PEDom2SubTipoUni', 'PEDom2SubUnidad',
  'PEDom2Num', 'PEDom2Piso', 'PEDom2Dpto', 'PEDom2Obs', 'PEDom2CodPos', 'PEDom2Loc', 'PEDom2Origen',
]

const PERSONA_EDITABLE = [
  'PECodTipDoc', 'PENumDoc', 'PEPrefijo', 'PEApellido', 'PENombre', 'PESexo', 'PETipo',
  'PEClase', 'PEEstCiv', 'PECondTribut', 'PECodNac', 'PECodSitBcra',
  'PEIDFIscal', 'PEIDFiscal_2', 'PEObserv', 'PEFecNac',
  'PEDomCalle', 'PEDomNum', 'PEDomPiso', 'PEDomDpto', 'PEDomObs', 'PEDomCodPos', 'PEDomLoc',
  'PEDomCodPrv', 'PEDomCodPart', 'PEDomCodDep',
] as const

export const personasRoutes: FastifyPluginAsync = async (app) => {
  app.post('/personas', async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>
    const ori = Number(body.PECodOri ?? 1) || 1
    const max = await prisma.personas.aggregate({
      where: { PECodOri: ori },
      _max: { PECodigo: true },
    })
    const cod = (max._max.PECodigo ?? 0) + 1
    const data: Record<string, unknown> = { PECodOri: ori, PECodigo: cod }
    for (const c of PERSONA_REQUIRED) data[c] = ''
    for (const k of PERSONA_EDITABLE) if (k in body && body[k] != null) data[k] = body[k]
    try {
      await prisma.personas.create({ data: data as never })
    } catch (e) {
      return reply.code(400).send({ error: (e as Error).message })
    }
    return { ok: true, PECodOri: ori, PECodigo: cod }
  })

  app.patch('/personas/:ori/:cod', async (req, reply) => {
    const { ori, cod } = req.params as { ori: string; cod: string }
    const body = (req.body ?? {}) as Record<string, unknown>
    const data: Record<string, unknown> = {}
    for (const k of PERSONA_EDITABLE) if (k in body) data[k] = body[k]
    if (!Object.keys(data).length) return reply.code(400).send({ error: 'sin campos editables' })
    try {
      const row = await prisma.personas.update({
        where: { PECodOri_PECodigo: { PECodOri: Number(ori), PECodigo: Number(cod) } },
        data: data as never,
      })
      return { ok: true, persona: row }
    } catch (e) {
      return reply.code(400).send({ error: (e as Error).message })
    }
  })

  app.get('/personas', async (req) => {
    const { q, page, pageSize } = req.query as {
      q?: string
      page?: string
      pageSize?: string
    }
    const take = Math.min(Number(pageSize) || 50, 200)
    const p = Math.max(Number(page) || 1, 1)

    const where = q
      ? {
          OR: [
            { PENombre: { contains: q, mode: 'insensitive' as const } },
            { PEApellido: { contains: q, mode: 'insensitive' as const } },
            { PENumDoc: { contains: q } },
          ],
        }
      : {}

    const [total, rows] = await Promise.all([
      prisma.personas.count({ where }),
      prisma.personas.findMany({
        where,
        orderBy: [{ PEApellido: 'asc' }, { PENombre: 'asc' }],
        skip: (p - 1) * take,
        take,
        select: listSelect,
      }),
    ])
    return { total, page: p, pageSize: take, rows }
  })

  app.get('/personas/:ori/:cod', async (req, reply) => {
    const { ori, cod } = req.params as { ori: string; cod: string }
    const oriN = Number(ori)
    const codN = Number(cod)
    const row = await prisma.personas.findUnique({
      where: {
        PECodOri_PECodigo: { PECodOri: oriN, PECodigo: codN },
      },
    })
    if (!row) return reply.code(404).send({ error: 'not found' })

    const [telefonos, domicilios, mails, deu, acr] = await Promise.all([
      prisma.telefono.findMany({ where: { TFCodOriPer: oriN, TFCodPer: codN } }),
      prisma.persDomi.findMany({ where: { PDCodOri: oriN, PDPersona: codN } }),
      prisma.persMail.findMany({ where: { PMCodOriPers: oriN, PMCodPers: codN } }),
      prisma.gestDeu.findMany({
        where: { GDCodOriDeu: oriN, GDCodDeu: codN },
        take: 500,
      }),
      prisma.gestAcre.findMany({
        where: { GACodOriAcr: oriN, GACodAcre: codN },
        take: 500,
      }),
    ])

    const campos = await decodeRow('P', row as unknown as Record<string, unknown>)

    const gestKeys = new Map<string, { ori: number; cod: number }>()
    for (const d of deu) gestKeys.set(`${d.GDCodOriGes}-${d.GDCodGest}`, { ori: d.GDCodOriGes, cod: d.GDCodGest })
    for (const a of acr) gestKeys.set(`${a.GACodOriGes}-${a.GACodGest}`, { ori: a.GACodOriGes, cod: a.GACodGest })
    const gestList = [...gestKeys.values()]

    let eventos: Array<Record<string, unknown>> = []
    if (gestList.length) {
      const tuple = gestList
        .slice(0, 500)
        .map((k) => `(${Number(k.ori)},${Number(k.cod)})`)
        .join(',')
      const evs = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT ${EVENTO_COLUMNS}
         FROM "Eventos"
         WHERE ("HGCodOriGes", "HGCodGes") IN (${tuple})
         ORDER BY "HGFecha" DESC NULLS LAST, "HGCodigo" DESC
         LIMIT 100`
      )
      eventos = await Promise.all(evs.map((e) => decodeEvento(e)))
    }

    const gestMap = new Map<string, { GECaratula: string; GENumCar: string }>()
    if (gestList.length) {
      const gest = await prisma.gestion.findMany({
        where: { OR: gestList.map((k) => ({ GECodOri: k.ori, GECodGest: k.cod })) },
        select: { GECodOri: true, GECodGest: true, GECaratula: true, GENumCar: true },
      })
      for (const g of gest) gestMap.set(`${g.GECodOri}-${g.GECodGest}`, g)
    }

    return {
      persona: row,
      campos,
      telefonos: await Promise.all(
        telefonos.map(async (t) => ({
          ...t,
          tipoDesc: await decodeValue('T', 'TFTipoTel', t.TFTipoTel),
        }))
      ),
      domicilios,
      mails: await Promise.all(
        mails.map(async (m) => ({
          ...m,
          tipoDesc: await decodeValue('M', 'PMTipo', m.PMTipo),
        }))
      ),
      eventos,
      gestionesDeudor: deu.map((d) => ({
        GECodOri: d.GDCodOriGes,
        GECodGest: d.GDCodGest,
        ...(gestMap.get(`${d.GDCodOriGes}-${d.GDCodGest}`) ?? {
          GECaratula: '',
          GENumCar: '',
        }),
      })),
      gestionesAcreedor: acr.map((a) => ({
        GECodOri: a.GACodOriGes,
        GECodGest: a.GACodGest,
        ...(gestMap.get(`${a.GACodOriGes}-${a.GACodGest}`) ?? {
          GECaratula: '',
          GENumCar: '',
        }),
      })),
    }
  })
}
