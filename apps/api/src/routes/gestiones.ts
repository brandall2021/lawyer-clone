import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../db'
import { decodeRow, decodeValue, decodeEvento, EVENTO_COLUMNS } from '../lib/decode'

const listSelect = {
  GECodOri: true,
  GECodGest: true,
  GECaratula: true,
  GENumCar: true,
  GENroPart: true,
  GEHabilitada: true,
  GEPrincipal: true,
  GEMontoTran: true,
  GEMoneda: true,
} as const

const personaSelect = {
  PECodOri: true,
  PECodigo: true,
  PEApellido: true,
  PENombre: true,
  PECodTipDoc: true,
  PENumDoc: true,
  PETipo: true,
} as const

type Key = { ori: number; cod: number }

async function personasByKeys(keys: Key[]) {
  const unique = new Map<string, Key>()
  for (const k of keys) unique.set(`${k.ori}-${k.cod}`, k)
  const list = [...unique.values()]
  const m = new Map<string, { PECodOri: number; PECodigo: number; PEApellido: string; PENombre: string; PECodTipDoc: string; PENumDoc: string; PETipo: string }>()
  if (!list.length) return m
  const rows = await prisma.personas.findMany({
    where: { OR: list.map((k) => ({ PECodOri: k.ori, PECodigo: k.cod })) },
    select: personaSelect,
  })
  for (const r of rows) m.set(`${r.PECodOri}-${r.PECodigo}`, r)
  return m
}

const GESTION_REQUIRED = [
  'GECaratula', 'GENumCar', 'GENroPart', 'GENumExt1', 'GENumExt2',
  'GEHabilitada', 'GEPrincipal', 'GEMontoTran',
  'GECodOri1erCli', 'GECod1erCli', 'GECodOri1erOp', 'GECod1erOp',
]

const GESTION_EDITABLE = [
  'GECaratula', 'GENumCar', 'GENroPart', 'GENumExt1', 'GENumExt2',
  'GEHabilitada', 'GEPrincipal', 'GEMontoTran', 'GEMoneda',
  'GECodTipGes', 'GECodEst', 'GECodSit', 'GECodCar', 'GECodAre', 'GECodRes',
  'GECodEstrat', 'GECodMora', 'GECodProd', 'GECodCamp', 'GECodTipPro',
  'GECodEstPro', 'GECodSiPro', 'GECodSeg1', 'GECodSeg2', 'GECodSeg3', 'GECodSeg4',
  'GECodEstu', 'GECodSuperv', 'GEComent', 'GEObserv', 'GEFecIni', 'GEFecFin',
] as const

const GESTION_NUMERIC = new Set([
  'GEMontoTran', 'GEMoneda', 'GECodTipGes', 'GECodEst', 'GECodSit', 'GECodCar',
  'GECodAre', 'GECodRes', 'GECodEstrat', 'GECodMora', 'GECodProd', 'GECodCamp',
  'GECodTipPro', 'GECodEstPro', 'GECodSiPro', 'GECodSeg1', 'GECodSeg2',
  'GECodSeg3', 'GECodSeg4', 'GECodEstu', 'GECodSuperv',
])

function coerceGestion(campo: string, v: unknown): unknown {
  if (v === '' || v === undefined) return GESTION_NUMERIC.has(campo) ? null : ''
  if (GESTION_NUMERIC.has(campo)) return Number(v)
  if (campo === 'GEHabilitada' || campo === 'GEPrincipal') return Boolean(v)
  return v
}

export const gestionesRoutes: FastifyPluginAsync = async (app) => {
  app.post('/gestiones', async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>
    const ori = Number(body.GECodOri ?? 1) || 1
    const max = await prisma.gestion.aggregate({
      where: { GECodOri: ori },
      _max: { GECodGest: true },
    })
    const cod = (max._max.GECodGest ?? 0) + 1
    const data: Record<string, unknown> = {
      GECodOri: ori,
      GECodGest: cod,
      GEHabilitada: true,
      GEPrincipal: false,
      GEMontoTran: 0,
      GECodOri1erCli: 0,
      GECod1erCli: 0,
      GECodOri1erOp: 0,
      GECod1erOp: 0,
    }
    for (const c of GESTION_REQUIRED) if (!(c in data)) data[c] = ''
    for (const k of GESTION_EDITABLE) if (k in body) data[k] = coerceGestion(k, body[k])
    try {
      await prisma.gestion.create({ data: data as never })
    } catch (e) {
      return reply.code(400).send({ error: (e as Error).message })
    }
    return { ok: true, GECodOri: ori, GECodGest: cod }
  })

  app.patch('/gestiones/:ori/:cod', async (req, reply) => {
    const { ori, cod } = req.params as { ori: string; cod: string }
    const body = (req.body ?? {}) as Record<string, unknown>
    const data: Record<string, unknown> = {}
    for (const k of GESTION_EDITABLE) if (k in body) data[k] = coerceGestion(k, body[k])
    if (!Object.keys(data).length) return reply.code(400).send({ error: 'sin campos editables' })
    try {
      const row = await prisma.gestion.update({
        where: { GECodOri_GECodGest: { GECodOri: Number(ori), GECodGest: Number(cod) } },
        data: data as never,
      })
      return { ok: true, gestion: row }
    } catch (e) {
      return reply.code(400).send({ error: (e as Error).message })
    }
  })

  app.get('/gestiones', async (req) => {
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
            { GECaratula: { contains: q, mode: 'insensitive' as const } },
            { GENumCar: { contains: q } },
            { GENroPart: { contains: q } },
          ],
        }
      : {}

    const [total, rows] = await Promise.all([
      prisma.gestion.count({ where }),
      prisma.gestion.findMany({
        where,
        orderBy: [{ GECodGest: 'desc' }],
        skip: (p - 1) * take,
        take,
        select: listSelect,
      }),
    ])
    return { total, page: p, pageSize: take, rows }
  })

  app.get('/gestiones/:ori/:cod', async (req, reply) => {
    const { ori, cod } = req.params as { ori: string; cod: string }
    const oriN = Number(ori)
    const codN = Number(cod)

    const gestion = await prisma.gestion.findUnique({
      where: { GECodOri_GECodGest: { GECodOri: oriN, GECodGest: codN } },
    })
    if (!gestion) return reply.code(404).send({ error: 'not found' })

    const campos = await decodeRow('G', gestion as unknown as Record<string, unknown>)

    const [deu, acr, abo, tel, agenda, historialCount] = await Promise.all([
      prisma.gestDeu.findMany({ where: { GDCodOriGes: oriN, GDCodGest: codN } }),
      prisma.gestAcre.findMany({ where: { GACodOriGes: oriN, GACodGest: codN } }),
      prisma.gestAbog.findMany({ where: { HACodOriGes: oriN, HACodGes: codN } }),
      prisma.telefono.findMany({ where: { TFCodOriGes: oriN, TFCodGes: codN } }),
      prisma.agenda.findMany({
        where: { AGCodOriGes: oriN, AGCodGest: codN },
        orderBy: { AGFecha: 'desc' },
        take: 100,
      }),
      prisma.histDeta.count({ where: { HDCodOriGes: oriN, HDCodGest: codN } }),
    ])

    const pmap = await personasByKeys([
      ...deu.map((d) => ({ ori: d.GDCodOriDeu, cod: d.GDCodDeu })),
      ...acr.map((a) => ({ ori: a.GACodOriAcr, cod: a.GACodAcre })),
      ...abo.map((a) => ({ ori: a.HACodOri, cod: a.HACodAbo })),
    ])

    const evs = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT ${EVENTO_COLUMNS}
       FROM "Eventos"
       WHERE "HGCodOriGes" = $1 AND "HGCodGes" = $2
       ORDER BY "HGFecha" DESC NULLS LAST, "HGCodigo" DESC
       LIMIT $3`,
      oriN,
      codN,
      500
    )
    const eventos = await Promise.all(evs.map((e) => decodeEvento(e)))

    return {
      gestion,
      campos,
      eventos,
      historialCount,
      deudores: deu.map((d) => ({
        ...d,
        persona: pmap.get(`${d.GDCodOriDeu}-${d.GDCodDeu}`) ?? null,
      })),
      acreedores: acr.map((a) => ({
        ...a,
        persona: pmap.get(`${a.GACodOriAcr}-${a.GACodAcre}`) ?? null,
      })),
      abogados: abo.map((a) => ({
        ...a,
        persona: pmap.get(`${a.HACodOri}-${a.HACodAbo}`) ?? null,
      })),
      telefonos: await Promise.all(
        tel.map(async (t) => ({
          ...t,
          tipoDesc: await decodeValue('T', 'TFTipoTel', t.TFTipoTel),
        }))
      ),
      agenda: await Promise.all(
        agenda.map(async (a) => ({
          ...a,
          tipoEvento: await decodeValue('A', 'AGCodTipEve', a.AGCodTipEve),
          responsable: await decodeValue('A', 'AGCodUsu', a.AGCodUsu),
        }))
      ),
    }
  })
}
