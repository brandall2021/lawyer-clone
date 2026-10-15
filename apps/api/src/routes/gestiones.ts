import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../db'

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

export const gestionesRoutes: FastifyPluginAsync = async (app) => {
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

    return {
      gestion,
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
      telefonos: tel,
      agenda,
    }
  })
}
