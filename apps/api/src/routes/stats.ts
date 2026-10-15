import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../db'
import { decodeValue } from '../lib/decode'
import { getTables } from '../lib/tables'

type Group = { cod: unknown; n: number }

async function grupoDecodificado(
  sql: string,
  tipo: string,
  campo: string,
  limit = 12
): Promise<Array<{ codigo: unknown; descripcion: string | null; n: number }>> {
  const rows = await prisma.$queryRawUnsafe<Group[]>(sql)
  const out = []
  for (const r of rows.slice(0, limit)) {
    out.push({
      codigo: r.cod,
      descripcion: await decodeValue(tipo, campo, r.cod),
      n: Number(r.n),
    })
  }
  return out
}

export const statsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/stats', async () => {
    const [
      tables,
      personas,
      gestiones,
      eventos,
      telefonos,
      deudores,
      abogados,
      gestionesPorEstado,
      gestionesPorArea,
      gestionesPorMoneda,
      eventosPorTipo,
      gestionesHabilitadas,
    ] = await Promise.all([
      getTables().then((t) => t.size),
      prisma.personas.count(),
      prisma.gestion.count(),
      prisma.$queryRawUnsafe<Array<{ n: bigint }>>('SELECT count(*) AS n FROM "Eventos"'),
      prisma.$queryRawUnsafe<Array<{ n: bigint }>>('SELECT count(*) AS n FROM "Telefono"'),
      prisma.$queryRawUnsafe<Array<{ n: bigint }>>('SELECT count(*) AS n FROM "GestDeu"'),
      prisma.$queryRawUnsafe<Array<{ n: bigint }>>('SELECT count(*) AS n FROM "GestAbog"'),
      grupoDecodificado(
        'SELECT "GECodEst" AS cod, count(*)::int AS n FROM "Gestion" GROUP BY 1 ORDER BY n DESC',
        'G',
        'GECodEst'
      ),
      grupoDecodificado(
        'SELECT "GECodAre" AS cod, count(*)::int AS n FROM "Gestion" GROUP BY 1 ORDER BY n DESC',
        'G',
        'GECodAre'
      ),
      grupoDecodificado(
        'SELECT "GEMoneda" AS cod, count(*)::int AS n FROM "Gestion" GROUP BY 1 ORDER BY n DESC',
        'G',
        'GEMoneda'
      ),
      grupoDecodificado(
        'SELECT "HGCodTipEve" AS cod, count(*)::int AS n FROM "Eventos" GROUP BY 1 ORDER BY n DESC',
        'E',
        'HGCodTipEve',
        15
      ),
      prisma.gestion.groupBy({ by: ['GEHabilitada'], _count: { _all: true } }),
    ])

    const eventosPorAnio = await prisma.$queryRawUnsafe<Array<{ anio: number; n: number }>>(
      `SELECT EXTRACT(YEAR FROM "HGFecha")::int AS anio, count(*)::int AS n
       FROM "Eventos"
       WHERE "HGFecha" IS NOT NULL
         AND EXTRACT(YEAR FROM "HGFecha") BETWEEN 1990 AND 2030
       GROUP BY 1 ORDER BY 1`
    )

    return {
      counts: {
        tables,
        personas,
        gestiones,
        eventos: Number(eventos[0]?.n ?? 0),
        telefonos: Number(telefonos[0]?.n ?? 0),
        deudores: Number(deudores[0]?.n ?? 0),
        abogados: Number(abogados[0]?.n ?? 0),
      },
      gestionesHabilitadas: gestionesHabilitadas.map((g) => ({
        habilitada: g.GEHabilitada,
        n: g._count._all,
      })),
      gestionesPorEstado,
      gestionesPorArea,
      gestionesPorMoneda,
      eventosPorTipo,
      eventosPorAnio,
    }
  })
}
