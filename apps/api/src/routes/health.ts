import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../db'

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => ({ ok: true }))

  app.get('/tables/count', async () => {
    const rows = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT count(*)::bigint as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `
    return { count: Number(rows[0].count) }
  })
}
